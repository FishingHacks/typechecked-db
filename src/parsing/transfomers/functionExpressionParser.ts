import { ITransformer } from '../types';
import stringEscape from './stringEscape';

export interface FunctionExpression {
    name: string;
    arguments: (FunctionExpression | ValueExpression)[];
}

export type ValueExpression = string | number | boolean;

export default {
    transform(string) {
        let val = '';

        const values = Object.values(string);
        let i = -1;
        function next() {
            i++;
            return values[i] || undefined;
        }
        function previous() {
            i--;
            return values[i] || undefined;
        }
        let char: string | undefined = '';

        function makeWord(): string {
            let char: string | undefined = '';
            let value = '';
            
            previous();
            while ((char = next())) {
                if (!"qwertzuioplkjhgfdsayxcvbnm".includes(char.toLowerCase())) break;
                else value += char;
            }
            previous();
            return value;
        }
        function makeWordOrBoolean(): string|boolean {
            const value = makeWord();

            if (value === 'false') return false;
            else if (value === 'true') return true;
            return value;
        }
        function makeString(): string {
            let char: string | undefined = '';
            let value = '';
            let escaping = false;

            while (char = next()) {
                if (escaping) {
                    value += stringEscape.transform(char);
                    escaping = false;
                } else if (char === '"') break;
                else if (char === '\\') escaping = true;
                else value += char;
            }

            return value;
        }
        function makeNumber(): number {
            let char: string | undefined = '';
            let value = '0';
            let hasDot = false;
            previous();
            while (char = next()) {
                if (char === '.' && !hasDot) {
                    value += '.';
                    hasDot = true;
                } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(char)) value += char;
                else break;
            }
            previous();
            return Number(value);
        }

        while ((char = next())) {
            if(char === '"') {
                const val = makeString();
                if (next() !== undefined) throw new Error("expected nothing, found " + values[i]);
                return val;
            }
            if ('1234567890'.includes(char)) {
                const val = makeNumber();
                if (next() !== undefined) throw new Error("expected nothing, found " + values[i]);
                return val;
            }
            else {
                const wordOrBoolean = makeWordOrBoolean();
                if (typeof wordOrBoolean === 'boolean') {
                    if (next() !== undefined) throw new Error("expected nothing, found " + values[i]);
                    return val;
                }
                else {
                    const v = next();
                    if (v === undefined) return {
                        arguments: [],
                        name: wordOrBoolean,
                    }
                    if (v !== '<') throw new Error('expected < but found ' + values[i]);
                    if (values[values.length-1] !== '>') throw new Error('expected > but found ' + values[values.length-1])
                    next();
                    const contents = values.slice(i, values.length-1).join('').split(',');
                    return {
                        name: wordOrBoolean,
                        arguments: contents.map(el => this.transform(el.trim()))
                    }
                }
            }
        }
        return "";
    },
} as ITransformer<string, FunctionExpression | ValueExpression>;