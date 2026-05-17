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
                                        : JSON.stringify(data)
                                : '');
        } catch {
            result = '';
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
        if (a !== b) {
            const aType = typeof(a);
            const bType = typeof(b);

            if ((aType === bType) && (a?.constructor === b?.constructor)) {
                if ((a instanceof RegExp) || (a instanceof Date)) {
                    return false;
                } else if (Array.isArray(a) ||
                           ((a instanceof Int8Array) || (a instanceof Uint8Array) || (a instanceof Uint8ClampedArray)) ||
                           ((a instanceof Int16Array) || (a instanceof Uint16Array)) ||
                           ((a instanceof Int32Array) || (a instanceof Uint32Array)) ||
                           ((a instanceof BigInt64Array) || (a instanceof BigUint64Array)) ||
                           ((a instanceof Float16Array) || (a instanceof Float32Array) || (a instanceof Float64Array))) {               
                    if (a.length === b.length) {
                        for (let index = 0; index < a.length; index++) {
                            if (!Helpers.equals(a[index], b[index])) {
                                return false;
                            }
                        }

                        return true;
                    } else {
                        return false;
                    }
                } else if (a instanceof Set) {
                    if (a.size === b.size) {
                        for (const el of a) {
                            if (!b.has(el)) {
                                return false;
                            }
                        }

                        return true;
                    } else {
                        return false;
                    }
                } else if (a instanceof Map) {
                    if (a.size === b.size) {
                        for (const [key, value] of a) {
                            if (!b.has(key) || !Helpers.equals(value, b.get(key))) {
                                return false;
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
                                if (!Helpers.equals(a[aPropName], b[bPropName])) {
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
        } else {
            return true;
        }
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
}