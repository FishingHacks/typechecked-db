import {
    localProvidersType,
    remoteProvidersType,
    localProviders,
    remoteProviders,
} from '../../data/providers';
import { DataSource } from '../parser';
import { IGenerator3 } from '../types';

export default {
    typings: (v) => '',
    generate([models, datasources]) {
        const db = datasources.find((el) => el.name === 'db');
        if (!db) throw new Error('Expected to find a "db" datasource');
        if (!db.data.provider)
            throw new Error(
                'Expected to find a "provider" field in the "db" datasource'
            );
        if (typeof db.data.provider !== 'string')
            throw new Error(
                'Expected to find a "provider" field in the "db" datasource of type "string"'
            );
        if (
            remoteProviders.includes(
                db.data.provider as typeof remoteProviders[number]
            )
        ) {
            if (typeof db.data.url !== 'string')
                throw new Error(
                    'Expected to find a "url" field in the "db" datasource of type "string"'
                );
        } else if (
            !localProviders.includes(
                db.data.provider as typeof localProviders[number]
            )
        )
            throw new Error(
                'Expected to find a supported provider. Found "' +
                    db.data.provider +
                    '"'
            );

        // @ts-ignore
        const dbdata:
            | { provider: remoteProvidersType; url: string }
            | { provider: localProvidersType } = remoteProviders.includes(
            db.data.provider as typeof remoteProviders[number]
        )
            ? { url: db.data.url, provider: db.data.provider }
            : { provider: db.data.provider || '' };

        return (
            "import DBClient, { ModelApi, middlewareFunction } from '../../../src/client/';\n" +
            generateImports(models) +
            '\nexport default class Client {\n' +
            indent(generateVariables(dbdata, models), '  ') +
            '\n\n' +
            indent(generateConstructor(dbdata, models), '  ') +
            '\n\n  $use(fn:middlewareFunction<' +
            modelTypings(models) +
            '>){\n' +
            '    if (this.disabledMiddleware) throw new Error("Middleware isn\'t enabled");\n' +
            '    return this.client.$use(fn);\n' +
            '  }\n' +
            '  $connect() {return this.client.$connect()};\n' +
            '  $disconnect() {return this.client.$disconnect()};\n' +
            '  get isConnected() {return this.client.isConnected};\n' +
            '}'
        );
    },
} as IGenerator3<
    [
        string[],
        DataSource<
            Record<string, string | number | boolean>,
            string | number | boolean
        >[]
    ]
>;

function generateAPI(name: string): string {
    return (
        'this.' +
        name.toLowerCase() +
        ' = {create(model) {return client.$create<m_' +
        name +
        '>(o_' +
        name +
        ', model, ' +
        JSON.stringify(name) +
        ');},find(query) {return client.$findMany<m_' +
        name +
        '>(o_' +
        name +
        ', query, ' +
        JSON.stringify(name) +
        ');},findOne(query) {return client.$findOne<m_' +
        name +
        '>(o_' +
        name +
        ', query, ' +
        JSON.stringify(name) +
        ');},findOneAndDelete(query) {return client.$delete<m_' +
        name +
        '>(o_' +
        name +
        ', query, ' +
        JSON.stringify(name) +
        ');},findOneAndUpdate(query, model) {return client.$update<m_' +
        name +
        '>(o_' +
        name +
        ', query, model, ' +
        JSON.stringify(name) +
        ');},clear() {return client.$clear<m_' +
        name +
        '>(' +
        JSON.stringify(name) +
        ')}}'
    );
}

function generateConstructor(
    provider:
        | { provider: localProvidersType }
        | { provider: remoteProvidersType; url: string },
    models: string[]
): string {
    return (
        'constructor(config?: { disableMiddleware?: boolean }) {\n' +
        '  config ||= {}\n' +
        '  this.disabledMiddleware = !!config.disableMiddleware;\n' +
        '  const client = new DBClient<' +
        modelTypings(models) +
        '>(' +
        JSON.stringify(provider) +
        ');\n' +
        '  this.client = client;\n' +
        indent(
            models
                .map(generateAPI)
                .map((el) => el + '\n')
                .join(''),
            '  '
        ) +
        '}'
    );
}

function generateVariables(
    provider:
        | { provider: localProvidersType }
        | { provider: remoteProvidersType; url: string },
    models: string[]
): string {
    return (
        'private disabledMiddleware: boolean;\n' +
        'private provider = ' +
        JSON.stringify(provider) +
        ';\n' +
        'private client: DBClient<' +
        modelTypings(models) +
        '>;' +
        models
            .map(
                (el) =>
                    '\nreadonly ' +
                    el.toLowerCase() +
                    ': ModelApi<m_' +
                    el +
                    '>'
            )
            .join('')
    );
}

function generateImports(models: string[]) {
    return (
        'import { ' +
        models.map((el) => el + ' as m_' + el) +
        " } from './types';\n" +
        'import { ' +
        models.map((el) => el + ' as o_' + el) +
        " } from './modelObjects';"
    );
}

function modelTypings(models: string[]) {
    return models.map((el) => 'm_' + el).join('|');
}

function indent(str: string, spaces: string): string {
    return str
        .split('\n')
        .map((el) => spaces + el)
        .join('\n');
}
