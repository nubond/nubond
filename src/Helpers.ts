import { Console } from './Console';

type typeofType = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";

/**
* Useful helpers
*/
export class Helpers {
    private static TAG_NAME_REGEX = /^(?:[A-Za-z][^\0\t\n\f\r\u0020/>]*|[:_\u0080-\u{10FFFF}][A-Za-z0-9-.:_\u0080-\u{10FFFF}]*)$/u;
    private static CAMEL_TO_KEBAB_CASE_REGEX = /[A-Z]/g;
    private static KEBAB_TO_CAMEL_CASE_REGEX = /-([a-z])/g;

    private constructor() {}

    /**
     * Check if value is undefined.
     * 
     * @param value value
     * @returns true - value is undefined, false - otherwise
     */
    public static isUndefined(value: any): boolean {
        return typeof(value) === 'undefined';
    }

    /**
     * Check if value is string.
     * 
     * @param value value
     * @returns true - value is string, false - otherwise
     */
    public static isString(value: any): boolean {
        return typeof(value) === 'string';
    }

    /**
     * Check if value is not empty string.
     * 
     * @param value value
     * @returns true - value is not empty string, false - otherwise
     */
    public static isNotEmptyString(value: any): boolean {
        return (typeof(value) === 'string') && (value.length > 0);
    }

    /**
     * Check if value is number.
     * 
     * @param value value
     * @returns true - value is number, false - otherwise
     */
    public static isNumber(value: any): boolean {
        return typeof(value) === 'number';
    }

    /**
     * Check if value is boolean.
     * 
     * @param value value
     * @returns true - value is boolean, false - otherwise
     */
    public static isBoolean(value: any): boolean {
        return typeof(value) === 'boolean';
    }

    /**
     * Check if value is object.
     * 
     * @param value value
     * @returns true - value is object, false - otherwise
     */
    public static isObject(value: any): boolean {
        return (typeof(value) === 'object') && (value !== null);
    }

    /**
     * Check if value is array.
     * 
     * @param value value
     * @returns true - value is array, false - otherwise
     */
    public static isArray(value: any): boolean {
        return Array.isArray(value);
    }

    /**
     * Check if value is iterable collection.
     * 
     * @param value value
     * @returns true - value is iterable collection, false - otherwise
     */
    public static isIterableCollection(value: any): boolean {
        return (value instanceof Map) || (value instanceof Set);
    }

    /**
     * Check if value is typed array.
     * 
     * @param value value
     * @returns true - value is typed array, false - otherwise
     */
    public static isTypedArray(value: any): boolean {
        return ((value instanceof Int8Array) || (value instanceof Uint8Array) || (value instanceof Uint8ClampedArray)) ||
               ((value instanceof Int16Array) || (value instanceof Uint16Array)) ||
               ((value instanceof Int32Array) || (value instanceof Uint32Array)) ||
               ((value instanceof BigInt64Array) || (value instanceof BigUint64Array)) ||
               ((value instanceof Float16Array) || (value instanceof Float32Array) || (value instanceof Float64Array));
    }

    /**
     * Check if value is function.
     * 
     * @param value value
     * @returns true - value is function, false - otherwise
     */
    public static isFunction(value: any): boolean {
        return typeof(value) === 'function';
    }

    /**
     * Check if value is symbol.
     * 
     * @param value value
     * @returns true - value is symbol, false - otherwise
     */
    public static isSymbol(value: any): boolean {
        return typeof(value) === 'symbol';
    }

    /**
     * Check if value is bigint.
     * 
     * @param value value
     * @returns true - value is bigint, false - otherwise
     */
    public static isBigInt(value: any): boolean {
        return typeof(value) === 'bigint';
    }

    /**
     * Check if value is valid element name.
     * 
     * @param value value
     * @returns true - value is valid element name, false - otherwise
     */
    public static isValidElementName(value: string): boolean {
        return (typeof(value) === 'string') && (value.length > 0) && this.TAG_NAME_REGEX.test(value);
    }

    /**
     * Check if value is valid custom element name.
     * 
     * @param value value
     * @returns true - value is valid element name, false - otherwise
     */
    public static isValidCustomElementName(value: string): boolean {
        return (typeof(value) === 'string') && (value.length > 0) && (value.indexOf('-') > 0) && this.TAG_NAME_REGEX.test(value);
    }

    /**
     * Check if value is valid identifier.
     * 
     * @param value identifier
     * @returns true - value is valid identifier, false - otherwise
     */
    public static isValidIdentifier(value: string): boolean {
        let result = false;

        if ((typeof(value) === 'string') && (value.length > 0)) {
            try {
                result = typeof(new Function(value, `"use strict"\nreturn ${value};`)) === 'function';
            } catch {
                //no need to log
            }
        }

        return result;
    }

    /**
     * Check if value is of primitive type.
     * 
     * @param value value
     * @returns true - value is of primitive type, false - otherwise
     */
    public static isPrimitive(value: any): boolean {
        return !(value instanceof Object) && ((value === null) || (typeof(value) !== 'object'));
    }

    /**
     * Stringify data.
     * 
     * @param data data
     * @returns stringified data
     */
    public static stringify(data: any): string {
        let result = '';
        
        try {
            const dataType = typeof(data);

            result = dataType === 'string' 
                        ? data
                        : ((dataType !== 'undefined') && (data !== null) && (dataType !== 'symbol') && (dataType !== 'function')
                                ? (dataType === 'boolean') || (dataType === 'number') || (dataType === 'bigint')
                                        ? `${data}`
                                        : this.stringifyObject(data)
                                : '');
        } catch (ex) {
            result = '';
            Console.error(data, `stringification failed with exception: ${ex}`);
        }

        return result;
    }

    /**
     * Compare two values for deep equality.
     *
     * @param a first value
     * @param b second value
     * @returns true - values are equal; false - otherwise
     */
    public static equals(a: any, b: any): boolean {
        return this.equalsInternal(a, b, new Map<object, Set<object> | null>(), new Map<object, Set<object>>());
    }

    /**
     * Convert a string from kebab-case to camelCase.
     *
     * @param value value in kebab-case
     * @returns value in camelCase
     */
    public static fromKebabToCamelCase(value: string): string {
                        //TODO: rewire with regular for loop
        return value.replace(this.KEBAB_TO_CAMEL_CASE_REGEX, (_, groupMatch) => groupMatch.toUpperCase());
    }

    /**
     * Convert a string from camelCase to kebab-case.
     *
     * @param value value in camelCase
     * @returns value in kebab-case
     */
    public static fromCamelToKebabCase(value: string): string {
                        //TODO: rewire with regular for loop
        return value.replace(this.CAMEL_TO_KEBAB_CASE_REGEX, (match, index) => index > 0 ? ('-' + match.toLowerCase()) : match.toLowerCase());
    }

    /**
     * Lowercase the first character of a string (camelCase first-letter normalization).
     *
     * @param value value
     * @returns value with its first character lowercased
     */
    public static toCamelCase(value: string): string {
        return value.charAt(0).toLowerCase() + value.substring(1);
    }

    /**
     * Uppercase the first character of a string (PascalCase first-letter normalization).
     *
     * @param value value
     * @returns value with its first character uppercased
     */
    public static toPascalCase(value: string): string {
        return value.charAt(0).toUpperCase() + value.substring(1);
    }

    /**
     * Format a string template by substituting `{N}` placeholders with positional arguments.
     *
     * @param template template containing `{0}`, `{1}`, … placeholders
     * @param args replacement values; `null` becomes empty string, `undefined` leaves the placeholder unchanged
     * @returns formatted string
     * @example
     * Helpers.format('Hello from {0}{1}', 'nuBond', '!');
     * // result: 'Hello from nuBond!'
     */
    public static format(template: string, ...args: Array<number | string | null | undefined>): string {
        return template.replace(/{(\d+)}/g, (match, index) => typeof (args[index]) === 'undefined'
                                                                    ? match
                                                                    : (args[index] === null
                                                                            ? ''
                                                                            : `${args[index]}`));
    }

    /**
     * Split a string by separator tha can be escaped
     * 
     * @param value value to split
     * @param separatorChar split by character
     * @param separatorEscapeChar character to escape split character
     * @returns array with splitted and trimmed not empty values
     */
    public static split(value: string, separatorChar: string, separatorEscapeChar: string): Array<string> {
        return Helpers.splitInternal(value, separatorChar, separatorEscapeChar, true) ??
               Helpers.splitInternal(value, separatorChar, separatorEscapeChar, false)!;
    }

    //the parts are JavaScript expressions: a separator inside a '…', "…" or `…` literal is text, and the literal is copied
    //verbatim (its JavaScript escapes intact); returns null for an unterminated literal, which then is not one (an @ constant)
    private static splitInternal(value: string, separatorChar: string, separatorEscapeChar: string, quoteAware: boolean): Array<string> | null {
        const result: Array<string> = [];

        const trimmedValue = value.trim();
        if (trimmedValue.length > 0) {
            let index = 0;
            let accumulator = '';
            let quoteChar: string | null = null;

            do
            {
                const currentChar = trimmedValue[index];
                if (quoteChar !== null) {
                    if ((currentChar === separatorEscapeChar) && (trimmedValue[index + 1] === separatorChar)) {
                        accumulator += trimmedValue[++index];       //an escaped separator: the escape is dropped, as outside literals
                    } else if ((currentChar === '\\') && (index + 1 < trimmedValue.length)) {
                        accumulator += currentChar + trimmedValue[++index];   //a JavaScript escape: copied, never closes the literal
                    } else {
                        accumulator += currentChar;
                        if (currentChar === quoteChar) {
                            quoteChar = null;
                        }
                    }
                } else if(currentChar === separatorChar) {
                    if (index > 0) {
                        if (trimmedValue[index - 1] !== separatorEscapeChar) {
                            const trimmedAccumulator = accumulator.trim();
                            if (trimmedAccumulator.length > 0) {
                                result.push(trimmedAccumulator);
                            }
                            accumulator = '';
                        } else {
                            accumulator = accumulator.substring(0, accumulator.length - 1) + currentChar;
                        }
                    }
                } else {
                    //a ' or " right after an identifier char (it's, 5') can't open a JavaScript literal: it is @ constant text
                    if (quoteAware && ((currentChar === '`') ||
                                       (((currentChar === '\'') || (currentChar === '"')) && !/[\w$]/.test(trimmedValue.charAt(index - 1))))) {
                        quoteChar = currentChar;
                    }

                    accumulator += currentChar;
                }
            } while (++index < trimmedValue.length);

            if (quoteChar !== null) {
                return null;
            }

            const trimmedAccumulator = accumulator.trim();
            if (trimmedAccumulator.length > 0) {
                result.push(trimmedAccumulator);
            }
        }

        return result;
    }

    private static stringifyObject(data: object): string {
        try {
            return JSON.stringify(data);
        } catch {
            const ancestors: Array<object> = [];

            return JSON.stringify(data, function (this: any, key: string, value: any): any {
                if (typeof(value) === 'bigint') {
                    return `${value}`;
                } else if ((typeof(value) === 'object') && (value !== null)) {
                    while ((ancestors.length > 0) && (ancestors[ancestors.length - 1] !== this)) {
                        ancestors.pop();
                    }

                    if (ancestors.includes(value)) {
                        return '[circular reference]';
                    }

                    ancestors.push(value);
                }

                return value;
            });
        }
    }

    private static equalsInternal(a: any, b: any, compared: Map<object, Set<object> | null>, processed: Map<object, Set<object>>): boolean {
        if (a !== b) {
            const aType = typeof(a);
            const bType = typeof(b);
            const isCacheable = (aType === 'object') && (bType === 'object') && (a !== null) && (b !== null);

            if (isCacheable && ((compared.get(a)?.has(b) === true) || (processed.get(a)?.has(b) === true))) {
                return true;
            } else {
                let inProgress = isCacheable ? processed.get(a) : undefined;
                if (isCacheable && (inProgress === undefined)) {
                    inProgress = new Set<object>();
                    processed.set(a, inProgress);
                }

                inProgress?.add(b);
                const result = this.deepEquals(a, b, aType, bType, compared, processed);
                inProgress?.delete(b);

                if (result && isCacheable) {
                    const partners = compared.get(a);
                    if (partners === undefined) {
                        compared.set(a, null);                     //first time: just remember a was seen
                    } else if (partners === null) {
                        compared.set(a, new Set<object>([b]));     //second time: a is shared, start caching
                    } else {
                        partners.add(b);
                    }
                }

                return result;
            }
        } else {
            return true;
        }
    }

    private static deepEquals(a: any, b: any, aType: typeofType, bType: typeofType, compared: Map<object, Set<object> | null>, processed: Map<object, Set<object>>): boolean {
        if ((aType === bType) && (a !== null) && (b !== null) && (a?.constructor === b?.constructor)) {
            if (a instanceof Date) {
                const aTime = a.getTime();
                const bTime = b.getTime();
                return (aTime === bTime) || (isNaN(aTime) && isNaN(bTime));
            } else if (a instanceof RegExp) {
                return (a.source === b.source) && (a.flags === b.flags);
            } else if ((aType === 'number') || (a instanceof Number)) {
                const aValue = a.valueOf();
                const bValue = b.valueOf();
                return (aValue === bValue) || (isNaN(aValue) && isNaN(bValue));
            } else if (a instanceof Boolean) {
                return a.valueOf() === b.valueOf();
            } else if (Array.isArray(a) ||
                        ((a instanceof Int8Array) || (a instanceof Uint8Array) || (a instanceof Uint8ClampedArray)) ||
                        ((a instanceof Int16Array) || (a instanceof Uint16Array)) ||
                        ((a instanceof Int32Array) || (a instanceof Uint32Array)) ||
                        ((a instanceof BigInt64Array) || (a instanceof BigUint64Array)) ||
                        ((a instanceof Float16Array) || (a instanceof Float32Array) || (a instanceof Float64Array))) {               
                if (a.length === b.length) {
                    for (let index = 0; index < a.length; index++) {
                        if (!Helpers.equalsInternal(a[index], b[index], compared, processed)) {
                            return false;
                        }
                    }

                    return true;
                } else {
                    return false;
                }
            } else if (a instanceof Set) {
                if (a.size === b.size) {
                    const unmatchedInA = [];
                    for (const el of a) {
                        if (!b.has(el)) {
                            unmatchedInA.push(el);
                        }
                    }

                    //deep comparison
                    if (unmatchedInA.length > 0) {
                        const unmatchedInB = Array.from(b).filter(el => !a.has(el));

                        for (const aItem of unmatchedInA) {
                            const matchIndex = unmatchedInB.findIndex(bItem => {
                                //a candidate may fail without failing the whole comparison
                                const candidateCompared = new Map<object, Set<object> | null>();
                                return Helpers.equalsInternal(aItem, bItem, candidateCompared, processed);
                            });

                            if (matchIndex < 0) {
                                return false;
                            } else {
                                unmatchedInB.splice(matchIndex, 1);
                            }
                        }

                        return true;
                    } else {
                        return true;
                    }
                } else {
                    return false;
                }
            } else if (a instanceof Map) {
                if (a.size === b.size) {
                    const unmatchedInA: Array<[any, any]> = [];
                    for (const [key, value] of a) {
                        if (b.has(key)) {
                            if (!Helpers.equalsInternal(value, b.get(key), compared, processed)) {
                                return false;
                            }
                        } else {
                            unmatchedInA.push([key, value]);
                        }
                    }

                    //deep comparison
                    if (unmatchedInA.length > 0) {
                        const unmatchedInB = Array.from(<Map<any, any>>b).filter(([key]) => !a.has(key));

                        for (const [aKey, aValue] of unmatchedInA) {
                            const matchIndex = unmatchedInB.findIndex(([bKey, bValue]) => {
                                //a candidate may fail without failing the whole comparison
                                const candidateCompared = new Map<object, Set<object> | null>();
                                return Helpers.equalsInternal(aKey, bKey, candidateCompared, processed) &&
                                       Helpers.equalsInternal(aValue, bValue, candidateCompared, processed);
                            });

                            if (matchIndex < 0) {
                                return false;
                            } else {
                                unmatchedInB.splice(matchIndex, 1);
                            }
                        }
                    }

                    return true;
                } else {
                    return false;
                }
            } else if (aType === 'object') {
                let aPropNames = [];
                let bPropNames = [];

                for (const name in a) {
                    aPropNames.push(name);
                }

                for (const name in b) {
                    bPropNames.push(name);
                }

                if (aPropNames.length === bPropNames.length) {
                    aPropNames = aPropNames.sort();
                    bPropNames = bPropNames.sort();

                    for (let index = 0; index < aPropNames.length; index++) {
                        const aPropName = aPropNames[index];
                        const bPropName = bPropNames[index];

                        if (aPropName === bPropName) {
                            if (!Helpers.equalsInternal(a[aPropName], b[bPropName], compared, processed)) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }

                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}