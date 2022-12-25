import { Field, Model } from '../parser';
import { IGenerator2 } from '../types';
import { FunctionExpression } from './functionExpressionParser';

export default {
    generate(models) {
        const interfaces: string[] = [];
        const objects: string[] = [];

        for (const m of models) {
            const [typedef, obj] = generateModel(m);
            interfaces.push(typedef);
            objects.push(obj);
        }

        return [
            interfaces.join('\n\n'),
            "import { ModelObject } from '../../../src/client';\n\n" +
                objects.join('\n\n'),
        ];
    },
    typings(models) {
        const requiredFunctions: string[] = [];
        const buildinTypes: string[] = [];

        for (const model of models) {
            for (const entry of Object.values(model.entries)) {
                if (
                    !buildinTypes.includes(entry.type.toLowerCase()) &&
                    entry.type !== 'enum'
                )
                    buildinTypes.push(entry.type.toLowerCase());
                let functions: FunctionExpression[] = [...entry.decorators];
                let fn: FunctionExpression | undefined;

                while ((fn = functions.pop())) {
                    if (!requiredFunctions.includes(fn.name))
                        requiredFunctions.push(fn.name);
                    functions.push(
                        ...(fn.arguments.filter(
                            (el) => typeof el === 'object'
                        ) as FunctionExpression[])
                    );
                }
            }
        }

        const styles = [
            ...buildinTypes
                .map((el) => buildins[el as keyof typeof buildins] || null)
                .filter((el) => el !== null),
            ...requiredFunctions
                .map((el) => types[el as keyof typeof types] || null)
                .filter((el) => el !== null),
        ].join('\n');

        return [styles, ''];
    },
} as IGenerator2<Model>;

const buildins = {
    dbid: 'type DatabaseId = number;',
    datetime: 'type DateTime = Date;',
    boolean: 'type Boolean = boolean;',
    string: 'type String = string;',
    reference: 'type Reference<T extends string> = T;',
    int: 'type Integer = number;',
    float: 'type Float = number;',
} as const;
const types = {
    '@optional': 'type Optional<T> = T | undefined;',
    '@default': 'export type Default<T, Value extends T> = T;',
    '@js': 'type JavaScript<T, Code extends String> = T;',
    '@charcode': 'type CharCode<T extends number> = string;',
    '@unique': 'type Unique<T> = T;',
    '@updatedat': 'type updateTimestamp<T> = Date;',
    '@id': 'type IdDecorator<T> = T',
    value: 'type Value<T> = T;',
    now: 'type now = Date;',
    autoincrement: 'type autoincrement = number;',
} as const;

function generateModel(model: Model): [string, string] {

    let code1 =
        'export interface ' +
        model.name +
        ' {\n  name: ' +
        JSON.stringify(model.name) +
        ';\n  entries: {\n';
    let code2 =
        'export const ' +
        model.name +
        ': ModelObject = {\n  name: ' +
        JSON.stringify(model.name) +
        ',\n  entries: {';

    for (const entry of Object.values(model.entries)) {
        const optional = hasFunction(entry.decorators, '@optional');
        const hasDefaultValue =
            hasFunction(entry.decorators, '@default') ||
            hasFunction(entry.decorators, '@charcode');
        const updateTimestamp = hasFunction(entry.decorators, '@updatedat');
        const unique = hasFunction(entry.decorators, '@unique');
        const array = hasFunction(entry.decorators, '@array');
        let defaultValue: any = '';

        for (const f of entry.decorators) {
            if (f.name === '@default' || f.name === '@charcode') {
                if (f.arguments.length !== 1)
                    throw new Error(
                        'Expected to find 1 argument, found ' +
                            f.arguments.length +
                            ' Arguments (fn: ' +
                            f.name +
                            ', entry: ' +
                            entry.name +
                            ')'
                    );
                if (
                    typeof f.arguments[0] === 'undefined' ||
                    f.arguments[0] === null
                )
                    throw new Error('unknown error');
                if (
                    typeof f.arguments[0] === 'object' &&
                    f.name === '@default'
                ) {
                    if (f.arguments[0].arguments.length !== 0)
                        throw new Error(
                            "Default values can't have arguments! (entry: " +
                                entry.name +
                                ', name: ' +
                                f.arguments[0].name +
                                ', model: ' +
                                model.name
                        );
                    defaultValue = { name: f.arguments[0].name };
                } else
                    defaultValue =
                        f.name === '@charcode'
                            ? String.fromCharCode(Number(f.arguments[0]))
                            : f.arguments[0];
            }
        }

        code1 +=
            '    ' +
            JSON.stringify(entry.name) +
            (optional || hasDefaultValue || updateTimestamp || array
                ? '?'
                : '') +
            ': ';
        code2 +=
            '    ' +
            JSON.stringify(entry.name) +
            ': { optional: ' +
            (!!optional).toString() +
            ', type: ' +
            JSON.stringify(entry.type) +
            ', unique: ' +
            (!!unique).toString() +
            (entry.type === 'reference'
                ? ', reference: ' + JSON.stringify(entry.reference)
                : '') +
            (entry.type === 'enum'
                ? ', enum: ' + JSON.stringify(entry.enum)
                : '') +
            ', hasDefaultValue: ' +
            (!!hasDefaultValue).toString() +
            ', useUpdateTimestamp: ' +
            (!!updateTimestamp).toString() +
            ', array: ' +
            (!!array).toString() +
            ', defaultValue: ' +
            (JSON.stringify(defaultValue) || 'null') +
            ' },\n';
        code1 += generateFunctionCode(
            entry.type,
            entry.decorators,
            entry.type === 'enum' ? entry.enum : '',
            entry.type === 'reference' ? entry.reference : ''
        );
        code1 += ';\n';
    }

    return [code1 + '  }\n}\n', code2 + '  }\n}'];
}
function hasFunction(functions: FunctionExpression[], name: string): boolean {
    for (const fn of functions) {
        if (
            fn.name === name ||
            hasFunction(
                fn.arguments.filter(
                    (el) => typeof el === 'object'
                ) as FunctionExpression[],
                name
            )
        )
            return true;
    }

    return false;
}
const functionTranslationMatrix = {
    '@optional': 'Optional',
    '@default': 'Default',
    '@js': 'JavaScript',
    '@charcode': 'CharCode',
    '@unique': 'Unique',
    '@fillin': 'FillIn',
    '@updatedat': 'updateTimestamp',
    '@id': 'IdDecorator',
    '@array': 'Array',
    value: 'Value',
} as const;
const realTypeNames = {
    dbid: 'DatabaseId',
    datetime: 'DateTime',
    boolean: 'Boolean',
    string: 'String',
    reference: 'Reference',
    int: 'Integer',
    float: 'Float',
};
function getRealFunctionName(fakeName: string): string {
    return (
        functionTranslationMatrix[
            fakeName as keyof typeof functionTranslationMatrix
        ] || fakeName
    );
}
function generateFunctionCode(
    type: Field['type'],
    functions: FunctionExpression[],
    enumName: string,
    reference: string
) {
    return displayFunction(
        translate(
            type === 'enum' ? enumName : realTypeNames[type],
            functions,
            reference
        )
    );
}
function displayFunction(fn: FunctionExpression) {
    let code =
        getRealFunctionName(fn.name) + (fn.arguments.length > 0 ? '<' : '');

    code += fn.arguments
        .map((el) =>
            typeof el !== 'object' ? JSON.stringify(el) : displayFunction(el)
        )
        .join(', ');

    return code + (fn.arguments.length > 0 ? '>' : '');
}
function translate(
    type: string,
    functions: FunctionExpression[],
    reference: string
): FunctionExpression {
    let currentFn: FunctionExpression = {
        name: type,
        arguments:
            type === 'Reference' ? [{ name: reference, arguments: [] }] : [],
    };

    while (functions.length > 0) {
        const tmp = functions.pop();
        if (!tmp) return currentFn;
        tmp.arguments.unshift(currentFn);
        currentFn = tmp;
    }

    return currentFn;
}
