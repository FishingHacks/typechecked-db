"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let i = 0;
exports.default = {
    transform(name) {
        if (name === 'now')
            return new Date();
        else if (name === 'autoincrement')
            return i++;
        else if (name === 'true' || name === 'false')
            return name === 'true';
        return '';
    },
};
