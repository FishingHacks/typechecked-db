"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const decoratorExpressionParser_1 = __importDefault(require("./decoratorExpressionParser"));
exports.default = {
    transform(value) {
        const entries = [];
        const id = value.entries.find((el) => el.name === 'id');
        if (!id)
            value.entries.push({
                decorators: '@id @default<autoincrement>',
                type: 'databaseid',
                name: 'id',
            });
        else if (!id.decorators.toLowerCase().includes('@id') &&
            !id.decorators.includes('@unique'))
            throw new Error('The id for ' + value.name + ' is not @id or @unique');
        else if (!id.decorators.toLowerCase().includes('@default<autoincrement>'))
            throw new Error('The id for ' +
                value.name +
                ' has to be defaulted to autoincrement');
        else if (id.type.toLowerCase() !== 'objectid' &&
            id.type.toLowerCase() !== 'databaseid')
            throw new Error('The id for ' + value.name + ' has to be ObjectID or DatabaseID');
        for (const field of value.entries) {
            const decorators = field.decorators
                .trim()
                .split('@')
                .map((el) => el.trim())
                .filter((el) => el.length > 0)
                .map((el) => '@' + el.toLowerCase())
                .map((el) => decoratorExpressionParser_1.default.transform(el))
                .filter((el) => typeof el === 'object');
            if (new Set(decorators.map((el) => el.name)).size !==
                decorators.length)
                throw new Error(value.name + '.' + field.name + ' has duplicate decorators');
            if (field.type.includes('<') && field.type.endsWith('>')) {
                const type = field.type;
                // Reference
                const start = type.indexOf('<');
                const ref = type.substring(0, start);
                const fieldName = type.substring(start + 1, type.length - 1);
                if (ref.toLowerCase() !== 'ref' &&
                    ref.toLowerCase() !== 'reference')
                    throw new SyntaxError('Expected a reference, found ' + ref);
                if (!fieldName.match(/^[a-zA-Z]+$/))
                    throw new SyntaxError('Model names can only be characters from a-z in upper or lowercase');
                if (decorators.find((el) => el.name.toLowerCase() === '@id' ||
                    el.name.toLowerCase() === '@default' ||
                    el.name.toLowerCase() === '@updatedat'))
                    throw new Error("Reference<...> can't have the decorators @id, @default<...> and @updatedAt");
                entries.push({
                    decorators,
                    name: field.name,
                    type: 'reference',
                    reference: fieldName,
                });
            }
            else {
                const type = field.type;
                const ltype = type.toLowerCase();
                const newType = ltype === 'boolean' || ltype === 'bool'
                    ? 'boolean'
                    : ltype === 'int' || ltype === 'integer'
                        ? 'int'
                        : ltype === 'float' ||
                            ltype === 'number' ||
                            ltype === 'f64'
                            ? 'float'
                            : ltype === 'date' || ltype === 'datetime'
                                ? 'datetime'
                                : ltype === 'databaseid' || ltype === 'objectid'
                                    ? 'dbid'
                                    : ltype === 'string' || ltype === 'chars'
                                        ? 'string'
                                        : type;
                if (newType === 'boolean' ||
                    newType === 'string' ||
                    newType === 'int' ||
                    newType === 'float' ||
                    newType === 'datetime' ||
                    newType === 'dbid')
                    entries.push({
                        name: field.name,
                        decorators,
                        type: newType,
                    });
                else
                    entries.push({
                        name: field.name,
                        decorators,
                        type: 'enum',
                        enum: newType,
                    });
                for (const d of decorators) {
                    if (d.name.toLowerCase() === '@id' && newType !== 'dbid')
                        throw new Error('Only Elements of type DatabaseID or ObjectID can have the @id decorator');
                    if (d.name.toLowerCase() === '@updatedat' &&
                        newType !== 'datetime' &&
                        newType !== 'int')
                        throw new Error('Only Elements of type DateTime or int can have the @updatedAtt decorator');
                }
            }
        }
        const entryRecord = {};
        for (const f of entries) {
            if (entryRecord[f.name] !== undefined)
                throw new Error('Duplicate of ' + value.name + '.' + f.name + ' found!');
            entryRecord[f.name] = f;
        }
        return {
            entries: entryRecord,
            name: value.name,
        };
    },
};
