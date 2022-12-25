import { ITransformer } from '../types';

export default {
    transform(value) {
        if (value === '0') return '\0';
        else if (value === 'n') return '\n';
        else if (value === 'r') return '\r';
        else if (value === 't') return '\t';
        else if (value === 'v') return '\v';
        else if (value === 'f') return '\f';
        return value;
    },
} as ITransformer<string>;
