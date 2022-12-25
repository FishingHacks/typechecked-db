import { DataSource } from '../parser';
import { IGenerator } from '../types';

export default {
    typings() {
        return '';
    },
    generate(values) {
        return values.map(generateDatasource).join('\n\n');
    },
} as IGenerator<DataSource<Record<string, string|number|boolean>, string|number|boolean>>;

function generateDatasource(
    source: DataSource<Record<string, string|number|boolean>, string|number|boolean>
): string {
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
