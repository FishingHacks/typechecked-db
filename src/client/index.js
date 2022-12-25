"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalProviderObject = exports.getRemoteProviderObject = void 0;
const providers_1 = require("../data/providers");
const defaultValueFunctionTranslator_1 = __importDefault(require("../parsing/transfomers/defaultValueFunctionTranslator"));
const provider_1 = require("../provider");
class FakeDbProvider {
    constructor() {
        this.connected = false;
        this.onConnect = () => { };
    }
    async clear(name) {
        return undefined;
    }
    async findMany(name, query) {
        return undefined;
    }
    async delete(name, query) {
        return true;
    }
    async create(name, obj) {
        return obj;
    }
    async update(name, query, obj) {
        return obj;
    }
    async findOne(name, query) {
        return undefined;
    }
    isConnected() {
        return this.connected;
    }
    $connect() {
        this.connected = true;
        this.onConnect();
        return new Promise((r) => r(undefined));
    }
    $disconnect() {
        this.connected = false;
        return new Promise((r) => r(undefined));
    }
}
function getRemoteProviderObject(provider, url) {
    return new FakeDbProvider();
}
exports.getRemoteProviderObject = getRemoteProviderObject;
function getLocalProviderObject(provider) {
    if (provider === 'enmap')
        return provider_1.enmap;
    return new FakeDbProvider();
}
exports.getLocalProviderObject = getLocalProviderObject;
class Client {
    constructor(provider) {
        this.middlewares = [];
        this.onConnectCallback = [];
        this.handling = false;
        this.provider = provider;
        if (providers_1.remoteProviders.includes(this.provider.provider)) {
            this.providerObject = getRemoteProviderObject(this.provider.provider, this.provider.url);
        }
        else
            this.providerObject = getLocalProviderObject(this.provider.provider);
        this.providerObject.onConnect = () => this.$runConnectCallbacks();
    }
    $use(fn) {
        this.middlewares.push(fn);
    }
    async $runConnectCallbacks() {
        this.handling = true;
        for (const cb of this.onConnectCallback) {
            try {
                await cb();
            }
            catch { }
        }
        this.handling = false;
    }
    async $create(obj, supplied, name) {
        await this.$waitForConn();
        this.$runMiddleware({
            method: 'create',
            name,
            args: {
                entries: supplied,
                name,
            },
        });
        const complete = await fillInWithType(supplied, obj.entries, name);
        return transformToRealObject(await this.providerObject.create(name, complete), obj.entries, name);
    }
    async $update(obj, query, supplied, name) {
        await this.$waitForConn();
        this.$runMiddleware({
            method: 'update',
            name,
            query,
            args: {
                name,
                entries: supplied,
            },
        });
        for (const k of Object.keys(obj.entries)) {
            const entry = obj.entries[k];
            if (entry.useUpdateTimestamp &&
                entry.type !== 'datetime' &&
                entry.type !== 'int')
                throw new Error('Only DateTime and int can have the @updatedAt decorator!');
            else if (entry.useUpdateTimestamp)
                supplied[k] = Date.now();
        }
        return transformToRealObject(await this.providerObject.update(name, query, supplied), obj.entries, name);
    }
    async $findOne(obj, query, name) {
        await this.$waitForConn();
        this.$runMiddleware({
            method: 'find',
            name,
            query,
        });
        const el = await this.providerObject.findOne(name, query);
        return el ? transformToRealObject(el, obj.entries, name) : undefined;
    }
    async $findMany(obj, query, name) {
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
    async $delete(obj, query, name) {
        await this.$waitForConn();
        this.$runMiddleware({
            method: 'remove',
            name,
            query,
        });
        if (!(await this.providerObject.delete(name, query)))
            throw new Error("Couldn't delete " + name);
    }
    async $clear(name) {
        await this.$waitForConn();
        this.$runMiddleware({
            method: 'clear',
            name,
        });
        return await this.providerObject.clear(name);
    }
    $waitForConn() {
        return new Promise((r) => this.$schedule(r));
    }
    $schedule(fn) {
        this.onConnectCallback.push(fn);
        if (!this.isConnected)
            this.$connect();
        else if (!this.handling)
            this.$runConnectCallbacks();
    }
    $runMiddleware(obj) {
        if (this.middlewares.length < 1)
            return;
        let i = 0;
        const middlewares = this.middlewares;
        function nextFunction() {
            i++;
            if (i >= middlewares.length)
                return new Promise((res) => res(undefined));
            return new Promise((res, rej) => {
                try {
                    const returnValue = middlewares[i](obj, nextFunction);
                    if (returnValue instanceof Promise) {
                        returnValue.then(res).catch(rej);
                    }
                    else
                        res(returnValue);
                }
                catch (e) {
                    rej(e);
                }
            });
        }
        middlewares[i](obj, nextFunction);
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
exports.default = Client;
function fillIn(provided, model, name) {
    for (const k of Object.keys(provided)) {
        if (!model[k] || model[k] === undefined || model[k] === null)
            delete provided[k];
    }
    for (const k of Object.keys(model)) {
        if (provided[k] !== undefined &&
            (provided[k] instanceof Array ? provided[k][0] !== undefined : true)) {
            const entry = model[k];
            const value = provided[k] instanceof Array ? provided[k][0] : provided[k];
            if (entry.array && !(value instanceof Array))
                provided[k] = [provided[k]];
            if (entry.useUpdateTimestamp &&
                entry.type !== 'datetime' &&
                entry.type !== 'int')
                throw new Error('Expected DateTime or int, found ' +
                    entry.type +
                    ' (model: ' +
                    name +
                    ', entry: ' +
                    k +
                    ')');
            else if (entry.useUpdateTimestamp)
                provided[k] = Date.now();
            else if (!typeMatches(entry.type, value))
                throw new Error('Expected ' +
                    entry.type +
                    ', found something else: ' +
                    JSON.stringify(value) +
                    ' (model: ' +
                    name +
                    ', entry: ' +
                    k +
                    ')');
            if (entry.type === 'datetime' && value instanceof Date)
                provided[k] = value.getTime();
        }
        else {
            const entry = model[k];
            if (!entry.optional &&
                !entry.array &&
                !entry.useUpdateTimestamp &&
                !(entry.hasDefaultValue &&
                    entry.defaultValue !== undefined &&
                    entry.defaultValue !== null))
                throw new Error('Expected ' + k + ' to be specified!');
            if (entry.array)
                provided[k] = [];
            else if (entry.useUpdateTimestamp) {
                if (entry.type !== 'datetime' && entry.type !== 'int')
                    throw new Error('Expected DateTime or int, found ' +
                        entry.type +
                        ' (model: ' +
                        name +
                        ', entry: ' +
                        k +
                        ')');
                provided[k] = Date.now();
            }
            else if (entry.hasDefaultValue) {
                if (entry.defaultValue === null ||
                    entry.defaultValue === undefined)
                    throw new Error('Defaultvalue not specified for ' + k + ' in ' + name);
                if (typeof entry.defaultValue === 'object') {
                    const newVal = defaultValueFunctionTranslator_1.default.transform(entry.defaultValue.name);
                    if (!typeMatches(entry.type, newVal))
                        throw new Error('Expected ' +
                            entry.type +
                            ', found something else: ' +
                            JSON.stringify(newVal) +
                            ' (model: ' +
                            name +
                            ', entry: ' +
                            k);
                    provided[k] =
                        newVal instanceof Date ? newVal.getTime() : newVal;
                }
                else {
                    if (!typeMatches(entry.type, entry.defaultValue))
                        throw new Error('Expected ' +
                            entry.type +
                            ', found something else: ' +
                            JSON.stringify(entry.defaultValue) +
                            ' (model: ' +
                            name +
                            ', entry: ' +
                            k +
                            ')');
                    provided[k] = entry.defaultValue;
                }
            }
        }
    }
    return provided;
}
function typeMatches(type, value) {
    if (type === 'boolean')
        return typeof value === 'boolean';
    else if (type === 'dbid')
        return (typeof value === 'number' &&
            Math.floor(value) === value &&
            value > -1);
    else if (type === 'enum')
        return typeof value === 'string';
    else if (type === 'datetime')
        return value instanceof Date;
    else if (type === 'float')
        return typeof value === 'number';
    else if (type === 'int')
        return typeof value === 'number' && Math.floor(value) === value;
    else if (type === 'reference')
        throw new Error('After parsing, no reference should exist anymore');
    else if (type === 'string')
        return typeof value === 'string';
    return false;
}
function fillInWithType(entries, object, name) {
    return fillIn(entries, object, name);
}
function transformToRealObject(entries, obj, name) {
    if (typeof entries !== 'object' || entries === null)
        return entries;
    for (const k of Object.keys(entries)) {
        if (entries[k] === undefined || entries[k] === null || obj[k] === null)
            delete entries[k];
        if (obj[k].type === 'datetime' && typeof entries[k] === 'number')
            entries[k] = new Date(entries[k]);
    }
    return fillIn(entries, obj, name);
}
