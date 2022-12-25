#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const client_1 = require("../client");
const providers_1 = require("../data/providers");
const parseArguments_1 = __importDefault(require("./parseArguments"));
async function main(argc, argv, file) {
    const { add, flags, objs } = (0, parseArguments_1.default)(argv);
    if (flags.includes('help') || argc === 0) {
        return console.log('TypecheckedDB\n\n--help: Display help-menu\n--clear <table>: Clear the table\n--show <table>: Show the table\n\nNote: To use the database, you have to specify a provider. Do that by adding --provider <provider>. Certain Provider (Remote Provider) require an url. You can specify the URL by adding --url <url>.\n\nRemote Providers:\n' +
            providers_1.remoteProviders.map((el) => el + '\n').join('') +
            '\nLocal Providers:\n' +
            providers_1.localProviders.join('\n'));
    }
    const provider = maybe({ provider: objs.provider, url: objs.url });
    if (!providers_1.localProviders.includes(provider.provider) &&
        !providers_1.remoteProviders.includes(provider.provider))
        return console.error(chalk_1.default.redBright('Error: Unsupported Provider ' +
            (provider.provider || 'no provider specified') +
            '\n\n') +
            'Supported Local Providers:\n' +
            providers_1.localProviders.map((el) => el + '\n').join('') +
            '\nSupported Remote Provider:\n' +
            providers_1.remoteProviders.join('\n'));
    if (!provider.url &&
        providers_1.remoteProviders.includes(provider.provider))
        return console.error(chalk_1.default.redBright('Error: Remote providers need a url'));
    const providerObj = providers_1.remoteProviders.includes(provider.provider)
        ? (0, client_1.getRemoteProviderObject)(provider.provider, provider.url)
        : (0, client_1.getLocalProviderObject)(provider.provider);
    console.log('Connecting...');
    await providerObj.$connect();
    console.log('Connected!');
    let handled = false;
    if (typeof objs.clear === 'string') {
        handled = true;
        const table = objs.clear;
        console.log('Clearing table ' + table);
        await providerObj.clear(table);
        console.log('Successfully cleared ' + table);
    }
    if (typeof objs.show === 'string') {
        handled = true;
        const table = objs.show;
        console.log('Obtaining table...');
        const tableArr = (await providerObj.findMany(table, {})) || [];
        let idLength = tableArr.reduce((a, b) => (b.id || 0).toString().length > a
            ? (b.id || 0).toString().length
            : a, 2) - 2;
        let valLength = tableArr.reduce((a, b) => {
            b = { ...b };
            delete b.id;
            for (const k of Object.keys(b)) {
                const val = b[k];
                if (typeof val === 'number' && val > 1671920900000)
                    b[k] =
                        val.toString() +
                            ' (' +
                            new Date(val).toLocaleString() +
                            ')';
            }
            const length = (JSON.stringify(b, null, '  ') || '')
                .split('\n')
                .reduce((a, b) => (b.length > a ? b.length : a), 0);
            return length > a ? length : a;
        }, 5) - 3;
        let halfValLength = Math.floor(valLength / 2);
        let halfIdLength = Math.floor(idLength / 2);
        console.log(chalk_1.default.bold('\nTable ' + table) +
            '\n|----' +
            fill(idLength, '-') +
            '|-------' +
            fill(valLength, '-') +
            '|\n| ' +
            fill(halfIdLength, ' ') +
            'ID' +
            fill(idLength - halfIdLength, ' ') +
            ' | ' +
            fill(halfValLength, ' ') +
            'Value' +
            fill(valLength - halfValLength, ' ') +
            ' |\n|----' +
            fill(idLength, '-') +
            '|-------' +
            fill(valLength, '-') +
            '|\n' +
            tableArr
                .map((el) => {
                const id = el.id || 1;
                delete el.id;
                for (const k of Object.keys(el)) {
                    const val = el[k];
                    if (typeof val === 'number' && val > 1671920900000)
                        el[k] =
                            val.toString() +
                                ' (' +
                                new Date(val).toLocaleString() +
                                ')';
                }
                const stringified = JSON.stringify(el, null, '  ');
                return ('| ' +
                    id +
                    fill(idLength + 2 - id.toString().length, ' ') +
                    ' | ' +
                    stringified
                        .split('\n')
                        .map((el, i) => i === 0
                        ? el +
                            fill(valLength + 5 - el.length, ' ') +
                            ' |\n'
                        : '| ' +
                            fill(idLength + 2, ' ') +
                            ' | ' +
                            el +
                            fill(valLength + 5 - el.length, ' ') +
                            ' |\n')
                        .join('') +
                    '|----' +
                    fill(idLength, '-') +
                    '|-------' +
                    fill(valLength, '-') +
                    '|');
            })
                .join('\n'));
    }
    if (!handled)
        console.log('Unknown command!');
}
main(process.argv.length - 2, process.argv.slice(2), process.argv[1]);
function maybe(obj) {
    for (const k of Object.keys(obj)) {
        if (obj[k] === undefined)
            delete obj[k];
    }
    return obj;
}
function fill(length, char) {
    let text = '';
    for (let i = 0; i < length; i++)
        text += char;
    return text;
}
