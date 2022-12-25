import Enmap from 'enmap';
import { DatabaseProvider, Queries } from '../../client';

const db: Enmap<string, Array<{ id: string } & any>> = new Enmap({
    name: 'TypeCheckedDBEnmapProviderDataBase',
});

export default {
    async $connect() {},
    async $disconnect() {},
    onConnect: () => {},
    isConnected: () => true,
    async create<T extends { id: number }>(name: string, obj: T) {
        if (typeof obj.id !== 'number')
            throw new Error(
                'Expected obj.id to be of type number. Found ' + typeof obj.id
            );
        if (!ensureUnique(name, obj.id))
            throw new Error('EnmapProvider: id is not unique!');

        let arr = db.get(name);
        if (!(arr instanceof Array)) arr = [];
        arr.push(obj);
        db.set(name, arr);
        return obj;
    },
    async delete(name, query) {
        try {
            let arr = db.get(name);
            if (!(arr instanceof Array)) arr = [];
            db.set(name, runQueryOnArrAndDelete(arr, query));
            return true;
        } catch {
            return false;
        }
    },
    async findMany(name, query) {
        let arr = db.get(name);
        if (!(arr instanceof Array)) arr = [];

        const forReturn = runQueryOnArr(arr, query);
        return forReturn.length > 0 ? forReturn : undefined;
    },
    async findOne(name, query) {
        let arr = db.get(name);
        if (!(arr instanceof Array)) arr = [];
        return runQueryOnArrOne(arr, query);
    },
    async update<T extends { id: number }>(
        name: string,
        query: Queries<T>,
        obj: T
    ) {
        let arr = db.get(name);
        if (!(arr instanceof Array)) arr = [];

        const [newArr, value] = runQueryOnArrAndUpdate(arr, query, obj);
        db.set(name, newArr);
        return value;
    },
    async clear(name) {
        db.delete(name);
    },
} as DatabaseProvider;

function ensureUnique(name: string, id: any) {
    let entries = db.get(name);
    if (!(entries instanceof Array)) entries = [];

    return !entries.find((el) => el.id === id);
}

function runQueryOnArr(arr: any[], query: Queries<any>) {
    let matches = [];
    for (const v of arr) {
        if (runQueryOnAttr(v, query)) matches.push(v);
    }
    return matches;
}
function runQueryOnArrOne(arr: any[], query: Queries<any>) {
    for (const v of arr) {
        if (runQueryOnAttr(v, query)) return v;
    }
    return undefined;
}
function runQueryOnArrAndDelete(arr: any[], query: Queries<any>) {
    let isFound = false;
    return arr.filter((el) => (isFound = isFound || !runQueryOnArr(el, query)));
}
function runQueryOnArrAndUpdate(
    arr: any[],
    query: Queries<any>,
    newValue: any
) {
    let isSet = false;
    let value = undefined;
    return [
        arr.map((el) => {
            if (!isSet && runQueryOnAttr(el, query)) {
                value = el;
                if (typeof value.id !== 'number') value.id = el.id;
                if (value.id !== el.id)
                    throw new Error(
                        'The id of the updated object has to be the same as the id of the existent object!'
                    );
                return Object.assign(el, newValue, { id: el.id });
            }
            isSet = true;
            return el;
        }),
        value,
    ] as [any[], any | undefined];
}
function runQueryOnAttr(attr: any, query: Queries<any>) {
    let isMatching = true;
    for (const [k, v] of Object.entries(query)) {
        if (typeof query[k] === 'object') {
            const q = query[k];
            if (
                q.startsWith &&
                typeof v === 'string' &&
                v.startsWith(q.startsWith)
            )
                isMatching = true;
            else {
                isMatching = false;
                break;
            }
            if (q.endsWith && typeof v === 'string' && v.endsWith(q.endsWith))
                isMatching = true;
            else {
                isMatching = false;
                break;
            }
            if (q.gt && typeof v === 'number' && v > q.gt) isMatching = true;
            else {
                isMatching = false;
                break;
            }
            if (q.lt && typeof v === 'number' && v < q.lt) isMatching = true;
            else {
                isMatching = false;
                break;
            }
        } else if (
            typeof v !== 'function' &&
            typeof query[k] !== 'string' &&
            v === query[k]
        )
            isMatching = true;
        else {
            isMatching = false;
            break;
        }
    }
    return isMatching;
}
