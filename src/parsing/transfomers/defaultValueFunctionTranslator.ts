import { ITransformer } from '../types';

let i = 0;

export default {
    transform(name) {
        if (name === 'now') return new Date();
        else if (name === 'autoincrement') return i++;
        else if (name === 'true' || name === 'false') return name === 'true';

        return '';
    },
} as ITransformer<string, string | boolean | number | Date>;
