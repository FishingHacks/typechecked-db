export type DatabaseId = number;
export type DateTime = Date;
export type Boolean = boolean;
export type String = string;
export type Reference<T> = T;
export type Integer = number;
export type Float = Integer|number;

export const builtins = [
    'DatabaseId',
    'DateTime',
    'Boolean',
    'String',
    'Reference',
    'Integer',
    'Float',
] as const;
export type builtinsType = typeof builtins[number];