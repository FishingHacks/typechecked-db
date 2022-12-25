import {
    localProvidersType,
    remoteProviders,
    remoteProvidersType,
} from '../data/providers';
import defaultValueFunctionTranslator from '../parsing/transfomers/defaultValueFunctionTranslator';
import { enmap } from '../provider';

export interface Model {
    name: string;
    entries: Record<string, any>;
}

export type Queries<T> = { [K in keyof T]?: Query<T[K]> };

type Query<T> =
    | (T extends string
          ? {
                startsWith?: string;
                endWith?: string;
            }
          : T extends number
          ? {
                gt?: T;
                lt?: T;
            }
          : never)
    | T;

export interface SynchronousModelApi<T extends Model> {
    readonly find: (query: Queries<T>) => T[] | undefined;
    readonly findOne: (query: Queries<T>) => T | undefined;
    readonly findOneAndUpdate: (query: Queries<T>, model: T) => T;
    readonly findOneAndDelete: (query: Queries<T>) => void;
    readonly create: (model: T) => T;
}

export interface ModelApi<T extends Model> {
    readonly find: (
        query: Queries<T['entries']>
    ) => Promise<T['entries'][] | undefined>;
    readonly findOne: (
        query: Queries<T['entries']>
    ) => Promise<T['entries'] | undefined>;
    readonly findOneAndUpdate: (
        query: Queries<T['entries']>,
        model: T['entries']
    ) => Promise<T['entries'] | undefined>;
    readonly findOneAndDelete: (query: Queries<T['entries']>) => Promise<void>;
    readonly create: (model: T['entries']) => Promise<T['entries']>;
    readonly clear: () => Promise<void>;
}

export type middlewareParams<T extends Model> =
    | {
          method: 'create';
          args: T;
          query?: never;
          name: T['name'];
      }
    | {
          method: 'remove' | 'find' | 'findMany';
          query: Queries<T['entries']>;
          name: T['name'];
          args?: never;
      }
    | {
          method: 'update';
          name: T['name'];
          query: Queries<T['entries']>;
          args: T;
      }
    | {
          method: 'clear';
          name: T['name'];
          query?: never;
          args?: never;
      };

export type middlewareFunction<T extends Model> = (
    params: middlewareParams<T>,
    next: () => void
) => any | Promise<any>;

class FakeDbProvider implements DatabaseProvider {
    async clear(name: string) {
        return undefined;
    }
    async findMany<T>(name: string, query: Queries<T>) {
        return undefined;
    }
    async delete<T>(name: string, query: Queries<T>) {
        return true;
    }
    async create<T>(name: string, obj: T) {
        return obj;
    }
    async update<T>(name: string, query: Queries<T>, obj: T) {
        return obj;
    }
    async findOne<T>(name: string, query: Queries<T>) {
        return undefined;
    }

    private connected: boolean = false;
    onConnect = () => {};

    isConnected() {
        return this.connected;
    }
    $connect(): Promise<void> {
        this.connected = true;
        this.onConnect();
        return new Promise((r) => r(undefined));
    }
    $disconnect(): Promise<void> {
        this.connected = false;
        return new Promise((r) => r(undefined));
    }
}

export function getRemoteProviderObject(provider: remoteProvidersType, url: string) {
    return new FakeDbProvider();
}
export function getLocalProviderObject(provider: localProvidersType) {
    if (provider === 'enmap') return enmap;
    return new FakeDbProvider();
}

export default class Client<T extends Model> {
    private middlewares: middlewareFunction<T>[] = [];
    private provider:
        | { provider: localProvidersType }
        | { provider: remoteProvidersType; url: string };
    private providerObject: DatabaseProvider;
    private onConnectCallback: (() => any)[] = [];
    private handling = false;

    constructor(
        provider:
            | { provider: localProvidersType }
            | { provider: remoteProvidersType; url: string }
    ) {
        this.provider = provider;

        if (
            remoteProviders.includes(
                this.provider.provider as remoteProvidersType
            )
        ) {
            this.providerObject = getRemoteProviderObject(
                (this.provider as { provider: remoteProvidersType }).provider,
                (this.provider as { url: string }).url
            );
        } else
            this.providerObject = getLocalProviderObject(
                (this.provider as { provider: localProvidersType }).provider
            );
        this.providerObject.onConnect = () => this.$runConnectCallbacks();
    }

    $use(fn: middlewareFunction<T>) {
        this.middlewares.push(fn);
    }
    async $runConnectCallbacks() {
        this.handling = true;
        for (const cb of this.onConnectCallback) {
            try {
                await cb();
            } catch {}
        }
        this.handling = false;
    }
    async $create<K extends T>(
        obj: ModelObject,
        supplied: K['entries'],
        name: K['name']
    ): Promise<K['entries']> {
        await this.$waitForConn();

        this.$runMiddleware<K>({
            method: 'create',
            name,
            args: {
                entries: supplied,
                name,
            } as K,
        });

        const complete = await fillInWithType<K>(supplied, obj.entries, name);
        return transformToRealObject(
            await this.providerObject.create<K['entries']>(name, complete),
            obj.entries,
            name
        );
    }
    async $update<K extends T>(
        obj: ModelObject,
        query: Queries<K['entries']>,
        supplied: K['entries'],
        name: K['name']
    ): Promise<K['entries'] | undefined> {
        await this.$waitForConn();

        this.$runMiddleware<K>({
            method: 'update',
            name,
            query,
            args: {
                name,
                entries: supplied,
            } as K,
        });

        for (const k of Object.keys(obj.entries)) {
            const entry = obj.entries[k];
            if (
                entry.useUpdateTimestamp &&
                entry.type !== 'datetime' &&
                entry.type !== 'int'
            )
                throw new Error(
                    'Only DateTime and int can have the @updatedAt decorator!'
                );
            else if (entry.useUpdateTimestamp)
                supplied[k as keyof K['entries']] = Date.now() as any;
        }
        return transformToRealObject(
            await this.providerObject.update<K['entries']>(name, query, supplied),
            obj.entries,
            name
        );
    }
    async $findOne<K extends T>(
        obj: ModelObject,
        query: Queries<K['entries']>,
        name: K['name']
    ): Promise<K['entries'] | undefined> {
        await this.$waitForConn();

        this.$runMiddleware({
            method: 'find',
            name,
            query,
        });

        const el = await this.providerObject.findOne(name, query);
        return el ? transformToRealObject(el, obj.entries, name) : undefined;
    }
    async $findMany<K extends T>(
        obj: ModelObject,
        query: Queries<K['entries']>,
        name: K['name']
    ): Promise<K['entries'][] | undefined> {
        await this.$waitForConn();

        this.$runMiddleware({
            method: 'findMany',
            name,
            query,
        });

        const el = await this.providerObject.findMany(name, query);
        return el
            ? el.map((ent) => transformToRealObject(ent, obj.entries, name))
            : undefined;
    }
    async $delete<K extends T>(
        obj: ModelObject,
        query: Queries<K['entries']>,
        name: K['name']
    ): Promise<void> {
        await this.$waitForConn();
        this.$runMiddleware<K>({
            method: 'remove',
            name,
            query,
        });

        if (!(await this.providerObject.delete(name, query)))
            throw new Error("Couldn't delete " + name);
    }
    async $clear<K extends T>(name: K['name']) {
        await this.$waitForConn();

        this.$runMiddleware<K>({
            method: 'clear',
            name,
        });
        return await this.providerObject.clear(name);
    }
    private $waitForConn(): Promise<void> {
        return new Promise((r) => this.$schedule(r as any));
    }
    private $schedule(fn: () => any) {
        this.onConnectCallback.push(fn);
        if (!this.isConnected) this.$connect();
        else if (!this.handling) this.$runConnectCallbacks();
    }
    private $runMiddleware<K extends T>(obj: middlewareParams<K>) {
        if (this.middlewares.length < 1) return;
        let i = 0;
        const middlewares = this.middlewares;

        function nextFunction() {
            i++;
            if (i >= middlewares.length)
                return new Promise((res) => res(undefined));
            return new Promise((res, rej) => {
                try {
                    const returnValue = middlewares[i](
                        obj as middlewareParams<K>,
                        nextFunction
                    );
                    if (returnValue instanceof Promise) {
                        returnValue.then(res).catch(rej);
                    } else res(returnValue);
                } catch (e) {
                    rej(e);
                }
            });
        }
        middlewares[i](obj as middlewareParams<K>, nextFunction);
    }
    $connect() {
        return this.providerObject.$connect();
    }
    $disconnect() {
        return this.providerObject.$disconnect();
    }
    get isConnected() {
        return this.providerObject.isConnected();
    }
}

export interface ModelObject {
    name: string;
    entries: Record<
        string,
        | {
              optional: boolean;
              type:
                  | 'boolean'
                  | 'string'
                  | 'int'
                  | 'float'
                  | 'datetime'
                  | 'dbid';
              unique: boolean;
              hasDefaultValue: boolean;
              useUpdateTimestamp: boolean;
              array: boolean;
              defaultValue: string | number | boolean | null | { name: string };
          }
        | {
              optional: boolean;
              type: 'enum';
              unique: boolean;
              enum: string;
              hasDefaultValue: boolean;
              useUpdateTimestamp: boolean;
              array: boolean;
              defaultValue: string | number | boolean | null;
          }
        | {
              optional: boolean;
              type: 'reference';
              unique: boolean;
              reference: string;
              hasDefaultValue: boolean;
              useUpdateTimestamp: boolean;
              array: boolean;
              defaultValue: string | number | boolean | null;
          }
    >;
}
export type DatabaseProvider = {
    readonly isConnected: () => boolean;
    readonly $connect: () => Promise<void>;
    readonly $disconnect: () => Promise<void>;
    onConnect: () => void;
    findOne: <T>(name: string, query: Queries<T>) => Promise<undefined | T>;
    findMany: <T>(name: string, query: Queries<T>) => Promise<undefined | T[]>;
    delete: <T>(name: string, query: Queries<T>) => Promise<boolean>;
    create: <T>(name: string, obj: T) => Promise<T>;
    update: <T>(
        name: string,
        query: Queries<T>,
        obj: T
    ) => Promise<T | undefined>;
    clear: (name: string) => Promise<void>;
};
function fillIn(
    provided: any,
    model: ModelObject['entries'],
    name: string
): Required<any> {
    for (const k of Object.keys(provided)) {
        if (!model[k] || model[k] === undefined || model[k] === null)
            delete provided[k];
    }

    for (const k of Object.keys(model)) {
        if (
            provided[k] !== undefined &&
            (provided[k] instanceof Array ? provided[k][0] !== undefined : true)
        ) {
            const entry = model[k];
            const value =
                provided[k] instanceof Array ? provided[k][0] : provided[k];
            if (entry.array && !(value instanceof Array))
                provided[k] = [provided[k]];
            if (
                entry.useUpdateTimestamp &&
                entry.type !== 'datetime' &&
                entry.type !== 'int'
            )
                throw new Error(
                    'Expected DateTime or int, found ' +
                        entry.type +
                        ' (model: ' +
                        name +
                        ', entry: ' +
                        k +
                        ')'
                );
            else if (entry.useUpdateTimestamp) provided[k] = Date.now();
            else if (!typeMatches(entry.type, value))
                throw new Error(
                    'Expected ' +
                        entry.type +
                        ', found something else: ' +
                        JSON.stringify(value) +
                        ' (model: ' +
                        name +
                        ', entry: ' +
                        k +
                        ')'
                );
            if (entry.type === 'datetime' && value instanceof Date)
                provided[k] = value.getTime();
        } else {
            const entry = model[k];

            if (
                !entry.optional &&
                !entry.array &&
                !entry.useUpdateTimestamp &&
                !(
                    entry.hasDefaultValue &&
                    entry.defaultValue !== undefined &&
                    entry.defaultValue !== null
                )
            )
                throw new Error('Expected ' + k + ' to be specified!');
            if (entry.array) provided[k] = [];
            else if (entry.useUpdateTimestamp) {
                if (entry.type !== 'datetime' && entry.type !== 'int')
                    throw new Error(
                        'Expected DateTime or int, found ' +
                            entry.type +
                            ' (model: ' +
                            name +
                            ', entry: ' +
                            k +
                            ')'
                    );
                provided[k] = Date.now();
            } else if (entry.hasDefaultValue) {
                if (
                    entry.defaultValue === null ||
                    entry.defaultValue === undefined
                )
                    throw new Error(
                        'Defaultvalue not specified for ' + k + ' in ' + name
                    );
                if (typeof entry.defaultValue === 'object') {
                    const newVal = defaultValueFunctionTranslator.transform(
                        entry.defaultValue.name
                    );
                    if (!typeMatches(entry.type, newVal))
                        throw new Error(
                            'Expected ' +
                                entry.type +
                                ', found something else: ' +
                                JSON.stringify(newVal) +
                                ' (model: ' +
                                name +
                                ', entry: ' +
                                k
                        );
                    provided[k] =
                        newVal instanceof Date ? newVal.getTime() : newVal;
                } else {
                    if (!typeMatches(entry.type, entry.defaultValue))
                        throw new Error(
                            'Expected ' +
                                entry.type +
                                ', found something else: ' +
                                JSON.stringify(entry.defaultValue) +
                                ' (model: ' +
                                name +
                                ', entry: ' +
                                k +
                                ')'
                        );
                    provided[k] = entry.defaultValue;
                }
            }
        }
    }

    return provided;
}
function typeMatches(
    type: ModelObject['entries'][number]['type'],
    value: any
): boolean {
    if (type === 'boolean') return typeof value === 'boolean';
    else if (type === 'dbid')
        return (
            typeof value === 'number' &&
            Math.floor(value) === value &&
            value > -1
        );
    else if (type === 'enum') return typeof value === 'string';
    else if (type === 'datetime') return value instanceof Date;
    else if (type === 'float') return typeof value === 'number';
    else if (type === 'int')
        return typeof value === 'number' && Math.floor(value) === value;
    else if (type === 'reference')
        throw new Error('After parsing, no reference should exist anymore');
    else if (type === 'string') return typeof value === 'string';

    return false;
}
function fillInWithType<K extends Model>(
    entries: K['entries'],
    object: ModelObject['entries'],
    name: K['name']
): Required<K['entries']> {
    return fillIn(entries, object, name) as Required<K>;
}
function transformToRealObject<K extends Model>(
    entries: any,
    obj: ModelObject['entries'],
    name: K['name']
): K {
    if (typeof entries !== 'object' || entries === null) return entries;

    for (const k of Object.keys(entries)) {
        if (entries[k] === undefined || entries[k] === null || obj[k] === null)
            delete entries[k];
        if (obj[k].type === 'datetime' && typeof entries[k] === 'number')
            entries[k] = new Date(entries[k]);
    }

    return fillIn(entries, obj, name) as K;
}
