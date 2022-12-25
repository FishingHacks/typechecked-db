export type Value<T> = T;
export type Optional<T> = T | undefined;
export type Default<T, Value extends T> = T;
export type JavaScript<T, Code extends String> = T;
export type CharCode<T extends number> = string;
export type Unique<T> = T;
export type FillIn<From extends string, Key extends String, T> = T;

export const decorators = [
    'optional',
    'default',
    'js',
    'charCode',
    'unique',
    'fillin',
] as const;
export type decoratorsType = typeof decorators[number];
