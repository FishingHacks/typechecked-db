import { DataSource, Enum, PrimitiveModel } from '../parser';
import enumGenerator from './generateEnums';
import datasourceGenerator from './generateDatasources';
import modelCreator from '../transfomers/modelCreator';
import modelGenerator from '../transfomers/modelGenerator';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import clientCreator from './clientCreator';
import values from '../transfomers/values';

export default function generate(
    enums: Enum[],
    unparsedDatasources: DataSource<Record<string, string>>[],
    primitiveModels: PrimitiveModel[],
    folder: string
) {
    const models = primitiveModels.map(modelCreator.transform);
    const datasources = unparsedDatasources.map(el => ({
        path: el.path,
        name: el.name,
        get: el.get,
        data: transformData(el.data)
    }))

    const [tmodels1] = modelGenerator.typings(models);
    const [models1, models2] = modelGenerator.generate(models);

    const enums1 = enumGenerator.generate(enums);
    const tenums1 = enumGenerator.typings(enums);

    const datasource1 = datasourceGenerator.generate(datasources);

    const createClient = clientCreator.generate([
        models.map((el) => el.name),
        datasources,
    ]);

    mkdirSync(folder, { recursive: true });
    writeFileSync(
        join(folder, 'types.d.ts'),
        tmodels1 + '\n' + tenums1 + '\n\n' + models1 + '\n\n' + enums1
    );
    writeFileSync(join(folder, 'modelObjects.ts'), models2);
    writeFileSync(join(folder, 'datasources.ts'), datasource1);
    writeFileSync(join(folder, 'client.ts'), createClient);
}

function transformData(obj: Record<string,string>): Record<string,string|number|boolean> {
    const newObj: Record<string,string|number|boolean> = {};

    for (const [k,v] of Object.entries(obj)) {
        newObj[k] = values.transform(v);
    }

    return newObj;
}