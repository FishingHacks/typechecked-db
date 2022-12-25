"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const path_1 = require("path");
const generate_1 = __importDefault(require("./typescript/generate"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const authorId = {
    name: 'authorId',
    decorators: [
        'optional',
        { name: 'fillin', values: ['authorId', 'id', 'string'] },
    ],
    type: 'string',
};
function parse(path, code) {
    function handleException(err) {
        const sst = (err.stack || err.message || err.name).split('\n');
        console.error(chalk_1.default.redBright('Error during Parsing: ' + sst[0]) + '\n' + sst.slice(1).join('\n'));
    }
    process.on('uncaughtException', handleException);
    process.on('unhandledRejection', (reason) => handleException(new Error('Uncaught Promise Rejection: ' + (0, util_1.inspect)(reason))));
    const datasources = [];
    const enums = [];
    const models = [];
    const lines = code.split('\n');
    let context = undefined;
    let val = '';
    let ctxType = '';
    let enumValues = [];
    let datasourceEntries = {};
    let name = '';
    let type = '';
    let entries = [];
    for (const [line, value] of Object.entries(lines)) {
        for (const [i, char] of Object.entries([
            ...Object.values(value),
            '\n',
        ])) {
            if (context === undefined) {
                if ((char === ' ' || char === '\t' || char === '\n') &&
                    val &&
                    !ctxType) {
                    if (val === 'datasource' ||
                        val === 'enum' ||
                        val === 'model')
                        ctxType = val;
                    else
                        logError({ character: i, line, path }, 'Unexpected character "' +
                            escapeCharacter(val) +
                            '"');
                    val = '';
                }
                else if (char === '{' && ctxType && val) {
                    context = {
                        ctx: ctxType,
                        name: val,
                    };
                    ctxType = '';
                    val = '';
                    name = '';
                }
                else if (isAllowedNameCharacter(char))
                    val += char;
                else if (char !== ' ' && char !== '\t' && char !== '\n') {
                    logError({ character: i, line, path }, 'Unexpected character "' + escapeCharacter(char) + '"');
                }
            }
            else if (context.ctx === 'enum') {
                if (char === '}') {
                    enums.push({
                        name: context.name,
                        values: enumValues,
                    });
                    context = undefined;
                    val = '';
                    enumValues = [];
                    ctxType = '';
                }
                else if (isAllowedNameCharacter(char))
                    val += char;
                else if (char === ' ' ||
                    char === '\t' ||
                    char === ',' ||
                    char === '\n') {
                    if (val)
                        enumValues.push(val.toUpperCase().trim());
                    val = '';
                }
                else
                    logError({ character: i, line, path }, 'Unexpected character ' + escapeCharacter(char));
            }
            else if (context.ctx === 'datasource') {
                if (char === '}') {
                    datasources.push(createDataSource(context.name, '<builtin>', datasourceEntries));
                    context = undefined;
                    val = '';
                    ctxType = '';
                    datasourceEntries = {};
                }
                else if (char === ':' && !name) {
                    // console.log(val);
                    if (val)
                        name = val.trim();
                    val = '';
                }
                else if (char === '\n') {
                    if (name && val)
                        datasourceEntries[name] = val.trim();
                    val = '';
                    name = '';
                }
                else
                    val += char;
            }
            else if (context.ctx === 'model') {
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
                }
                else if (char === ':') {
                    if (!val)
                        logError({ character: i, line, path }, 'Expected character, found ":"');
                    if (!name) {
                        name = val;
                        val = '';
                    }
                }
                else if (isAllowedNameCharacter(char))
                    val += char;
                else if (char === '\n') {
                    // console.log(name)
                    if (name) {
                        if (!type && !val)
                            logError({ character: i, line, path }, 'Expected Type, found nothing');
                        if (!type && val)
                            type = val;
                        entries.push({
                            name: name.trim(),
                            decorators: val.trim(),
                            type: type.trim(),
                        });
                    }
                    else if (val) {
                        logError({ character: i, line, path }, 'Expected ":", found nothing');
                    }
                    name = '';
                    type = '';
                    val = '';
                }
                else if (char === ' ' || char === '\t') {
                    if (name && type)
                        val += ' ';
                    else if (name && !type && val) {
                        type = val;
                        val = '';
                    }
                }
                else if (char !== '\n')
                    val += char;
            }
        }
    }
    return { enums, models, datasources, path };
}
function createDataSource(name, path, data) {
    function get(path) {
        return data[path] || undefined;
    }
    return {
        data,
        name,
        path,
        get,
    };
}
function logError(pos, error) {
    console.error('index.db:' +
        (Number(pos.line) + 1) +
        ':' +
        (Number(pos.character) + 1) +
        ': ' +
        error);
    process.exit(1);
}
function isAllowedNameCharacter(str) {
    for (const c of allowedNameCharacters) {
        if (str === c)
            return true;
    }
    return false;
}
function escapeCharacter(char) {
    if (char === '\n')
        return '\\n';
    else if (char === '\r')
        return '\\r';
    else if (char === '\t')
        return '\\t';
    else if (char === '\0')
        return '\\0';
    else if (char === '\v')
        return '\\v';
    else if (char === '\f')
        return '\\f';
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
async function parseFolder(folder) {
    const files = await (0, promises_1.readdir)(folder, { withFileTypes: true });
    const parsedFiles = [];
    await Promise.allSettled(files
        .filter((el) => el.isFile() && el.name.endsWith('.db'))
        .map((el) => new Promise((res, rej) => (0, promises_1.readFile)((0, path_1.join)(folder, el.name))
        .then((buf) => {
        parsedFiles.push(parse(el.name, buf.toString()));
        res('');
    })
        .catch((e) => rej(e)))));
    const names = [];
    const dnames = [];
    let error = false;
    const enums = [];
    const models = [];
    const datasources = [];
    for (const f of parsedFiles) {
        for (const m of f.models) {
            if (!names.includes(m.name))
                names.push(m.name);
            else {
                error = true;
                console.error(f.path +
                    ': A Database Entry with the name ' +
                    m.name +
                    ' already exists!');
            }
            models.push(m);
        }
        for (const m of f.enums) {
            if (!names.includes(m.name))
                names.push(m.name);
            else {
                error = true;
                console.error(f.path +
                    ': A Database Entry with the name ' +
                    m.name +
                    ' already exists!');
            }
            enums.push(m);
        }
        for (const m of Object.values(f.datasources)) {
            if (!dnames.includes(m.name))
                dnames.push(m.name);
            else {
                error = true;
                console.error(f.path +
                    ': A Datasource with the name ' +
                    m.name +
                    ' already exists!');
            }
            datasources.push(m);
        }
    }
    if (error)
        process.exit(1);
    (0, generate_1.default)(enums, datasources, models, (0, path_1.join)(folder, 'build'));
}
parseFolder((0, path_1.join)(process.cwd(), 'examples/src'));
