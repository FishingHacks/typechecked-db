import { ITransformer } from "../types";
import functionExpressionParser from "./functionExpressionParser";
import functionRunner from "./functionRunner";

export default {
    transform(str) {
        const expr = functionExpressionParser.transform(str);
        if (typeof expr !== 'object') return expr;
        return functionRunner.transform(expr);
    }
} as ITransformer<string, string|number|boolean>;