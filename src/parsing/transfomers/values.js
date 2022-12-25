"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functionExpressionParser_1 = __importDefault(require("./functionExpressionParser"));
const functionRunner_1 = __importDefault(require("./functionRunner"));
exports.default = {
    transform(str) {
        const expr = functionExpressionParser_1.default.transform(str);
        if (typeof expr !== 'object')
            return expr;
        return functionRunner_1.default.transform(expr);
    }
};
