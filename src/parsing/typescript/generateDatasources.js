"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    typings() {
        return '';
    },
    generate(values) {
        return values.map(generateDatasource).join('\n\n');
    },
};
function generateDatasource(source) {
    let code = 'export const ' + source.name + ' = {\n';
    for (const [k, v] of Object.entries(source.data)) {
        code +=
            '    ' +
                (k.match(/[a-z]/) ? k : JSON.stringify(k)) +
                ': ' +
                JSON.stringify(v) +
                ',\n';
    }
    code += '} as const;';
    return code;
}
