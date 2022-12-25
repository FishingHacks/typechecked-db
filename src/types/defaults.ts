import { DateTime, Integer } from './builtin';

export type now = DateTime;
export type updateTimestamp = DateTime;
export type autoincrement = Integer;
export type value<T> = T;

export const defaults = [
    'now',
    'updateTimestamp',
    'autoincrement',
    'value'
] as const;
export type defaultsType = typeof defaults[number];