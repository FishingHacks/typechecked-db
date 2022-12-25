#! /usr/bin/env node

import chalk from 'chalk';
import { getLocalProviderObject, getRemoteProviderObject } from '../client';
import { localProviders, remoteProviders } from '../data/providers';
import parse from './parseArguments';

async function main(argc: number, argv: string[], file: string) {
    const { add, flags, objs } = parse(argv);

    if (flags.includes('help') || argc === 0) {
        return console.log(
            'TypecheckedDB\n\n--help: Display help-menu\n--clear <table>: Clear the table\n--show <table>: Show the table\n\nNote: To use the database, you have to specify a provider. Do that by adding --provider <provider>. Certain Provider (Remote Provider) require an url. You can specify the URL by adding --url <url>.\n\nRemote Providers:\n' +
                remoteProviders.map((el) => el + '\n').join('') +
                '\nLocal Providers:\n' +
                localProviders.join('\n')
        );
    }

    const provider = maybe({ provider: objs.provider, url: objs.url });
    if (
        !localProviders.includes(
            provider.provider as typeof localProviders[number]
        ) &&
        !remoteProviders.includes(
            provider.provider as typeof remoteProviders[number]
        )
    )
        return console.error(
            chalk.redBright(
                'Error: Unsupported Provider ' +
                    (provider.provider || 'no provider specified') +
                    '\n\n'
            ) +
                'Supported Local Providers:\n' +
                localProviders.map((el) => el + '\n').join('') +
                '\nSupported Remote Provider:\n' +
                remoteProviders.join('\n')
        );
    if (
        !provider.url &&
        remoteProviders.includes(
            provider.provider as typeof remoteProviders[number]
        )
    )
        return console.error(
            chalk.redBright('Error: Remote providers need a url')
        );

    const providerObj = remoteProviders.includes(
        provider.provider as typeof remoteProviders[number]
    )
        ? getRemoteProviderObject(
              provider.provider as typeof remoteProviders[number],
              provider.url
          )
        : getLocalProviderObject(
              provider.provider as typeof localProviders[number]
          );
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
        const tableArr: ({ id?: number } & Record<string, any>)[] =
            (await providerObj.findMany(table, {})) || [];
        let idLength =
            tableArr.reduce(
                (a, b) =>
                    (b.id || 0).toString().length > a
                        ? (b.id || 0).toString().length
                        : a,
                2
            ) - 2;
        let valLength =
            tableArr.reduce((a, b) => {
                b = { ...b };
                delete b.id;
                for (const k of Object.keys(b)) {
                    const val = b[k as keyof typeof b];
                    if (typeof val === 'number' && val > 1671920900000)
                        b[k as keyof typeof b] =
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

        console.log(
            chalk.bold('\nTable ' + table) +
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
                            const val = el[k as keyof typeof el];
                            if (typeof val === 'number' && val > 1671920900000)
                                el[k as keyof typeof el] =
                                    val.toString() +
                                    ' (' +
                                    new Date(val).toLocaleString() +
                                    ')';
                        }
                        const stringified = JSON.stringify(el, null, '  ');
                        return (
                            '| ' +
                            id +
                            fill(idLength + 2 - id.toString().length, ' ') +
                            ' | ' +
                            stringified
                                .split('\n')
                                .map((el, i) =>
                                    i === 0
                                        ? el +
                                          fill(valLength + 5 - el.length, ' ') +
                                          ' |\n'
                                        : '| ' +
                                          fill(idLength + 2, ' ') +
                                          ' | ' +
                                          el +
                                          fill(valLength + 5 - el.length, ' ') +
                                          ' |\n'
                                )
                                .join('') +
                            '|----' +
                            fill(idLength, '-') +
                            '|-------' +
                            fill(valLength, '-') +
                            '|'
                        );
                    })
                    .join('\n')
        );
    }
    if (!handled) console.log('Unknown command!');
}

main(process.argv.length - 2, process.argv.slice(2), process.argv[1]);

function maybe<T extends Record<string, any | undefined>>(obj: T): NotUndef<T> {
    for (const k of Object.keys(obj)) {
        if (obj[k] === undefined) delete obj[k];
    }

    return obj;
}

type NotUndef<T> = {
    [K in keyof T]: T[K] extends undefined ? never : T[K];
};

function fill(length: number, char: string): string {
    let text = '';
    for (let i = 0; i < length; i++) text += char;
    return text;
}
