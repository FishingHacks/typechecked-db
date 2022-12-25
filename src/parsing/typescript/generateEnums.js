"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    generate: (enums) => {
        return enums.map(generateEnum).join('\n');
    },
    typings: (enums) => {
        return enums.length < 1 ? '' : 'type DBEnum<T extends string> = T;';
    }
};
function generateEnum(enumObject) {
    return ('export type ' +
        enumObject.name +
        ' = DBEnum<' +
        enumObject.values.map((el) => JSON.stringify(el)).join('|') +
        '>');
}
