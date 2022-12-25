import { Enum } from '../parser';
import { IGenerator } from '../types';

export default {
    generate: (enums) => {
        return enums.map(generateEnum).join('\n');
    },    
    typings: (enums) => {
        return enums.length < 1 ? '' : 'type DBEnum<T extends string> = T;';
    }
} as IGenerator<Enum>;


function generateEnum(enumObject: Enum): string {
    return (
        'export type ' +
        enumObject.name +
        ' = DBEnum<' +
        enumObject.values.map((el) => JSON.stringify(el)).join('|') +
        '>'
    );
}
