"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generateEnums_1 = __importDefault(require("./generateEnums"));
const generateDatasources_1 = __importDefault(require("./generateDatasources"));
const modelCreator_1 = __importDefault(require("../transfomers/modelCreator"));
const modelGenerator_1 = __importDefault(require("../transfomers/modelGenerator"));
const fs_1 = require("fs");
const path_1 = require("path");
const clientCreator_1 = __importDefault(require("./clientCreator"));
const values_1 = __importDefault(require("../transfomers/values"));
function generate(enums, unparsedDatasources, primitiveModels, folder) {
    const models = primitiveModels.map(modelCreator_1.default.transform);
    const datasources = unparsedDatasources.map(el => ({
        path: el.path,
        name: el.name,
        get: el.get,
        data: transformData(el.data)
    }));
    const [tmodels1] = modelGenerator_1.default.typings(models);
    const [models1, models2] = modelGenerator_1.default.generate(models);
    const enums1 = generateEnums_1.default.generate(enums);
    const tenums1 = generateEnums_1.default.typings(enums);
    const datasource1 = generateDatasources_1.default.generate(datasources);
    const createClient = clientCreator_1.default.generate([
        models.map((el) => el.name),
        datasources,
    ]);
    (0, fs_1.mkdirSync)(folder, { recursive: true });
    (0, fs_1.writeFileSync)((0, path_1.join)(folder, 'types.d.ts'), tmodels1 + '\n' + tenums1 + '\n\n' + models1 + '\n\n' + enums1);
    (0, fs_1.writeFileSync)((0, path_1.join)(folder, 'modelObjects.ts'), models2);
    (0, fs_1.writeFileSync)((0, path_1.join)(folder, 'datasources.ts'), datasource1);
    (0, fs_1.writeFileSync)((0, path_1.join)(folder, 'client.ts'), createClient);
}
exports.default = generate;
function transformData(obj) {
    const newObj = {};
    for (const [k, v] of Object.entries(obj)) {
        newObj[k] = values_1.default.transform(v);
    }
    return newObj;
}
