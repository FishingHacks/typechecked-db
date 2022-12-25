import { localProvidersType, remoteProvidersType } from '../data/providers';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import generate from './typescript/generate';
import { FunctionExpression } from './transfomers/functionExpressionParser';
import { inspect } from 'util';
import chalk from 'chalk';

export interface DataSource<T extends Record<string, K>, K = string> {
    readonly data: Readonly<T>;
    readonly path: string;
    name: string;
    readonly get: (path: string) => K | undefined;
}
export type Database =
    | DataSource<{ provider: remoteProvidersType; url: string }>
    | DataSource<{ provider: localProvidersType }>;

export interface Entry {
    name: string;
    decorators: (Type | string)[];
    type: Type | string;
}

interface Type {
    name: string;
    values: (string | Type)[];
}

const authorId: Entry = {
    name: 'authorId',
    decorators: [
        'optional',
        { name: 'fillin', values: ['authorId', 'id', 'string'] },
    ],
    type: 'string',
};

export interface PrimitiveModel {
    name: string;
    entries: {
        name: string;
        type: string;
        decorators: string;
    }[];
}

export interface Model {
    name: string;
    entries: Record<string, Field>;
}

export type Field =
    | {
          name: string;
          type: 'boolean' | 'string' | 'int' | 'float' | 'datetime' | 'dbid';
          decorators: FunctionExpression[];
      }
    | {
          name: string;
          type: 'reference';
          reference: string;
          decorators: FunctionExpression[];
      }
    | {
          name: string;
          type: 'enum';
          enum: string;
          decorators: FunctionExpression[];
      };

export interface Enum {
    name: string;
    values: string[];
}

interface Position {
    line: number | string;
    character: number | string;
    path: string;
}

type Context<T extends string> =
    | {
          name: string;
          ctx: T;
      }
    | undefined;

function parse(path: string, code: string) {
    function handleException(err: Error) {
        const sst = (err.stack || err.message || err.name).split('\n');

        console.error(chalk.redBright('Error during Parsing: ' + sst[0]) + '\n' + sst.slice(1).join('\n'))
    }

    process.on('uncaughtException', handleException);
    process.on('unhandledRejection', (reason) =>
        handleException(
            new Error('Uncaught Promise Rejection: ' + inspect(reason))
        )
    );

    const datasources: DataSource<Record<string, string>>[] = [];
    const enums: Enum[] = [];
    const models: PrimitiveModel[] = [];

    const lines = code.split('\n');

    let context: Context<'datasource' | 'model' | 'enum'> = undefined;
    let val = '';
    let ctxType = '';
    let enumValues: string[] = [];
    let datasourceEntries: Record<string, string> = {};
    let name = '';
    let type: string = '';
    let entries: PrimitiveModel['entries'] = [];

    for (const [line, value] of Object.entries(lines)) {
        for (const [i, char] of Object.entries([
            ...Object.values(value),
            '\n',
        ])) {
            if (context === undefined) {
                if (
                    (char === ' ' || char === '\t' || char === '\n') &&
                    val &&
                    !ctxType
                ) {
                    if (
                        val === 'datasource' ||
                        val === 'enum' ||
                        val === 'model'
                    )
                        ctxType = val;
                    else
                        logError(
                            { character: i, line, path },
                            'Unexpected character "' +
                                escapeCharacter(val) +
                                '"'
                        );
                    val = '';
                } else if (char === '{' && ctxType && val) {
                    context = {
                        ctx: ctxType as 'enum',
                        name: val,
                    };
                    ctxType = '';
                    val = '';
                    name = '';
                } else if (isAllowedNameCharacter(char)) val += char;
                else if (char !== ' ' && char !== '\t' && char !== '\n') {
                    logError(
                        { character: i, line, path },
                        'Unexpected character "' + escapeCharacter(char) + '"'
                    );
                }
            } else if (context.ctx === 'enum') {
                if (char === '}') {
                    enums.push({
                        name: context.name,
                        values: enumValues,
                    });
                    context = undefined;
                    val = '';
                    enumValues = [];
                    ctxType = '';
                } else if (isAllowedNameCharacter(char)) val += char;
                else if (
                    char === ' ' ||
                    char === '\t' ||
                    char === ',' ||
                    char === '\n'
                ) {
                    if (val) enumValues.push(val.toUpperCase().trim());
                    val = '';
                } else
                    logError(
                        { character: i, line, path },
                        'Unexpected character ' + escapeCharacter(char)
                    );
            } else if (context.ctx === 'datasource') {
                if (char === '}') {
                    datasources.push(
                        createDataSource(
                            context.name,
                            '<builtin>',
                            datasourceEntries
                        )
                    );
                    context = undefined;
                    val = '';
                    ctxType = '';
                    datasourceEntries = {};
                } else if (char === ':' && !name) {
                    // console.log(val);
                    if (val) name = val.trim();
                    val = '';
                } else if (char === '\n') {
                    if (name && val) datasourceEntries[name] = val.trim();
                    val = '';
                    name = '';
                } else val += char;
            } else if (context.ctx === 'model') {
                if (char === '}') {
                    models.push({
                        name: context.name,
                        entries,
                    });
                    entries = [];
                    type = '';
                    val = '';
                    ctxType = '';
                    context = undefined;
                } else if (char === ':') {
                    if (!val)
                        logError(
                            { character: i, line, path },
                            'Expected character, found ":"'
                        );
                    if (!name) {
                        name = val;
                        val = '';
                    }
                } else if (isAllowedNameCharacter(char)) val += char;
                else if (char === '\n') {
                    // console.log(name)
                    if (name) {
                        if (!type && !val)
                            logError(
                                { character: i, line, path },
                                'Expected Type, found nothing'
                            );
                        if (!type && val) type = val;

                        entries.push({
                            name: name.trim(),
                            decorators: val.trim(),
                            type: type.trim(),
                        });
                    } else if (val) {
                        logError(
                            { character: i, line, path },
                            'Expected ":", found nothing'
                        );
                    }
                    name = '';
                    type = '';
                    val = '';
                } else if (char === ' ' || char === '\t') {
                    if (name && type) val += ' ';
                    else if (name && !type && val) {
                        type = val;
                        val = '';
                    }
                } else if (char !== '\n') val += char;
            }
        }
    }

    return { enums, models, datasources, path };
}

function createDataSource<T extends Record<string, string>>(
    name: string,
    path: string,
    data: T
): DataSource<T> {
    function get(path: string): string | undefined {
        return data[path] || undefined;
    }

    return {
        data,
        name,
        path,
        get,
    };
}

function logError(pos: Position, error: string) {
    console.error(
        'index.db:' +
            (Number(pos.line) + 1) +
            ':' +
            (Number(pos.character) + 1) +
            ': ' +
            error
    );
    process.exit(1);
}

function isAllowedNameCharacter(str: string): boolean {
    for (const c of allowedNameCharacters) {
        if (str === c) return true;
    }
    return false;
}

function escapeCharacter(char: string): string {
    if (char === '\n') return '\\n';
    else if (char === '\r') return '\\r';
    else if (char === '\t') return '\\t';
    else if (char === '\0') return '\\0';
    else if (char === '\v') return '\\v';
    else if (char === '\f') return '\\f';

    return char;
}

const allowedNameCharacters = [
    'q',
    'w',
    'e',
    'r',
    't',
    'z',
    'u',
    'i',
    'o',
    'p',
    'l',
    'k',
    'j',
    'h',
    'g',
    'f',
    'd',
    's',
    'a',
    'y',
    'x',
    'c',
    'v',
    'b',
    'n',
    'm',
    'Q',
    'W',
    'E',
    'R',
    'T',
    'Z',
    'U',
    'I',
    'O',
    'P',
    'L',
    'K',
    'J',
    'H',
    'G',
    'F',
    'D',
    'S',
    'A',
    'Y',
    'X',
    'C',
    'V',
    'B',
    'N',
    'M',
];

async function parseFolder(folder: string) {
    const files = await readdir(folder, { withFileTypes: true });
    const parsedFiles: {
        enums: Enum[];
        models: PrimitiveModel[];
        datasources: DataSource<Record<string, string>>[];
        path: string;
    }[] = [];
    await Promise.allSettled(
        files
            .filter((el) => el.isFile() && el.name.endsWith('.db'))
            .map(
                (el) =>
                    new Promise((res, rej) =>
                        readFile(join(folder, el.name))
                            .then((buf) => {
                                parsedFiles.push(
                                    parse(el.name, buf.toString())
                                );
                                res('');
                            })
                            .catch((e) => rej(e))
                    )
            )
    );
    const names: string[] = [];
    const dnames: string[] = [];
    let error = false;

    const enums: Enum[] = [];
    const models: PrimitiveModel[] = [];
    const datasources: DataSource<Record<string, string>>[] = [];

    for (const f of parsedFiles) {
        for (const m of f.models) {
            if (!names.includes(m.name)) names.push(m.name);
            else {
                error = true;
                console.error(
                    f.path +
                        ': A Database Entry with the name ' +
                        m.name +
                        ' already exists!'
                );
            }
            models.push(m);
        }
        for (const m of f.enums) {
            if (!names.includes(m.name)) names.push(m.name);
            else {
                error = true;
                console.error(
                    f.path +
                        ': A Database Entry with the name ' +
                        m.name +
                        ' already exists!'
                );
            }
            enums.push(m);
        }
        for (const m of Object.values(f.datasources)) {
            if (!dnames.includes(m.name)) dnames.push(m.name);
            else {
                error = true;
                console.error(
                    f.path +
                        ': A Datasource with the name ' +
                        m.name +
                        ' already exists!'
                );
            }
            datasources.push(m);
        }
    }
    if (error) process.exit(1);

    generate(enums, datasources, models, join(folder, 'build'));
}

parseFolder(join(process.cwd(), 'examples/src'));
