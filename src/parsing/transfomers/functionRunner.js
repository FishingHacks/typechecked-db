"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    transform(expr) {
        if (expr.name === 'env') {
            if (expr.arguments.length !== 1)
                throw new SyntaxError('Error: env function takes 1 argument');
            if (typeof expr.arguments[0] === 'object')
                expr.arguments[0] = this.transform(expr.arguments[0]);
            if (typeof expr.arguments[0] !== 'string')
                throw new SyntaxError('Error: The first argument of the env-function has to be a string');
            return process.env[expr.arguments[0]] || '';
        }
        else if (expr.name === 'value') {
            if (expr.arguments.length !== 1)
                throw new SyntaxError('Error: value function takes 1 argument');
            if (typeof expr.arguments[0] === 'object')
                expr.arguments[0] = this.transform(expr.arguments[0]);
            return expr.arguments[0];
        }
        throw new SyntaxError('Error: Function ' + expr.name + ' is not a function!');
    }
};
