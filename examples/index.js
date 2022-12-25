"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const path_1 = require("path");
//@ts-ignore
const client_1 = __importDefault(require("./src/build/client"));
const a = new client_1.default();
const LOGFILE = (0, path_1.join)(__dirname, 'latest.log.txt');
a.user.clear();
a.post.clear();
//@ts-ignore
a.$use((params, next) => {
    const log = `/*[${new Date().toLocaleString()}]*/ a.${params.name.toLowerCase()}.${params.method === 'findMany'
        ? 'find'
        : params.method === 'find'
            ? 'findOne'
            : params.method}(${params.query
        ? JSON.stringify(params.query, null, '  ') +
            (params.args ? ', ' : '')
        : ''}${params.args ? JSON.stringify(params.args.entries, null, '  ') : ''});\n\n`;
    next();
    (0, promises_1.writeFile)(LOGFILE, log, { flag: 'a' })
        .catch(() => { })
        .then(() => { });
});
a.post.create({
    createdAt: new Date(),
    published: true,
    title: 'a',
    updatedAt: new Date(),
}).then(console.log);
a.post.create({
    createdAt: new Date(),
    title: 'aa',
    updatedAt: new Date(),
}).then(console.log);
a.post.create({
    createdAt: new Date(),
    published: true,
    title: 'aaa',
    updatedAt: new Date(),
}).then(console.log);
// a.post.find({
//     id: 1,
// });
a.user.create({
    email: 'fishinghacks@proton.me',
    name: 'Fishi',
}).then(console.log);
a.user.findOneAndUpdate({
    id: 3,
}, {
    email: '',
    name: '',
}).then(console.log);
