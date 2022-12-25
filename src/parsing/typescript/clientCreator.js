"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("../../data/providers");
exports.default = {
    typings: (v) => '',
    generate([models, datasources]) {
        const db = datasources.find((el) => el.name === 'db');
        if (!db)
            throw new Error('Expected to find a "db" datasource');
        if (!db.data.provider)
            throw new Error('Expected to find a "provider" field in the "db" datasource');
        if (typeof db.data.provider !== 'string')
            throw new Error('Expected to find a "provider" field in the "db" datasource of type "string"');
        if (providers_1.remoteProviders.includes(db.data.provider)) {
            if (typeof db.data.url !== 'string')
                throw new Error('Expected to find a "url" field in the "db" datasource of type "string"');
        }
        else if (!providers_1.localProviders.includes(db.data.provider))
            throw new Error('Expected to find a supported provider. Found "' +
                db.data.provider +
                '"');
        // @ts-ignore
        const dbdata = providers_1.remoteProviders.includes(db.data.provider)
            ? { url: db.data.url, provider: db.data.provider }
            : { provider: db.data.provider || '' };
        return ("import DBClient, { ModelApi, middlewareFunction } from '../../../src/client/';\n" +
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
            '}');
    },
};
function generateAPI(name) {
    return ('this.' +
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
        ')}}');
}
function generateConstructor(provider, models) {
    return ('constructor(config?: { disableMiddleware?: boolean }) {\n' +
        '  config ||= {}\n' +
        '  this.disabledMiddleware = !!config.disableMiddleware;\n' +
        '  const client = new DBClient<' +
        modelTypings(models) +
        '>(' +
        JSON.stringify(provider) +
        ');\n' +
        '  this.client = client;\n' +
        indent(models
            .map(generateAPI)
            .map((el) => el + '\n')
            .join(''), '  ') +
        '}');
}
function generateVariables(provider, models) {
    return ('private disabledMiddleware: boolean;\n' +
        'private provider = ' +
        JSON.stringify(provider) +
        ';\n' +
        'private client: DBClient<' +
        modelTypings(models) +
        '>;' +
        models
            .map((el) => '\nreadonly ' +
            el.toLowerCase() +
            ': ModelApi<m_' +
            el +
            '>')
            .join(''));
}
function generateImports(models) {
    return ('import { ' +
        models.map((el) => el + ' as m_' + el) +
        " } from './types';\n" +
        'import { ' +
        models.map((el) => el + ' as o_' + el) +
        " } from './modelObjects';");
}
function modelTypings(models) {
    return models.map((el) => 'm_' + el).join('|');
}
function indent(str, spaces) {
    return str
        .split('\n')
        .map((el) => spaces + el)
        .join('\n');
}
