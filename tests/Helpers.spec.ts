import { Helpers } from '../src/Helpers';

describe('Helpers', () => {
    describe('isUndefined', () => {
        it('should return true for undefined', () => {
            expect(Helpers.isUndefined(undefined)).toBe(true);
        });

        it('should return false for null', () => {
            expect(Helpers.isUndefined(null)).toBe(false);
        });

        it('should return false for 0', () => {
            expect(Helpers.isUndefined(0)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(Helpers.isUndefined('')).toBe(false);
        });

        it('should return false for false', () => {
            expect(Helpers.isUndefined(false)).toBe(false);
        });
    });

    describe('isString', () => {
        it('should return true for a string', () => {
            expect(Helpers.isString('hello')).toBe(true);
        });

        it('should return true for empty string', () => {
            expect(Helpers.isString('')).toBe(true);
        });

        it('should return false for a number', () => {
            expect(Helpers.isString(42)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(Helpers.isString(undefined)).toBe(false);
        });
    });

    describe('isNotEmptyString', () => {
        it('should return true for non-empty string', () => {
            expect(Helpers.isNotEmptyString('hello')).toBe(true);
        });

        it('should return false for empty string', () => {
            expect(Helpers.isNotEmptyString('')).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(Helpers.isNotEmptyString(undefined)).toBe(false);
        });

        it('should return false for null', () => {
            expect(Helpers.isNotEmptyString(null)).toBe(false);
        });
    });

    describe('isNumber', () => {
        it('should return true for a number', () => {
            expect(Helpers.isNumber(42)).toBe(true);
        });

        it('should return true for NaN', () => {
            expect(Helpers.isNumber(NaN)).toBe(true);
        });

        it('should return false for a string', () => {
            expect(Helpers.isNumber('42')).toBe(false);
        });
    });

    describe('isBoolean', () => {
        it('should return true for true', () => {
            expect(Helpers.isBoolean(true)).toBe(true);
        });

        it('should return true for false', () => {
            expect(Helpers.isBoolean(false)).toBe(true);
        });

        it('should return false for number 1', () => {
            expect(Helpers.isBoolean(1)).toBe(false);
        });
    });

    describe('isObject', () => {
        it('should return true for plain object', () => {
            expect(Helpers.isObject({})).toBe(true);
        });

        it('should return true for array', () => {
            expect(Helpers.isObject([])).toBe(true);
        });

        it('should return false for null', () => {
            expect(Helpers.isObject(null)).toBe(false);
        });

        it('should return false for string', () => {
            expect(Helpers.isObject('hello')).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(Helpers.isObject(undefined)).toBe(false);
        });
    });

    describe('isArray', () => {
        it('should return true for array', () => {
            expect(Helpers.isArray([1, 2, 3])).toBe(true);
        });

        it('should return true for empty array', () => {
            expect(Helpers.isArray([])).toBe(true);
        });

        it('should return false for object', () => {
            expect(Helpers.isArray({})).toBe(false);
        });
    });

    describe('isIterableCollection', () => {
        it('should return true for Map', () => {
            expect(Helpers.isIterableCollection(new Map())).toBe(true);
        });

        it('should return true for Map with entries', () => {
            const map = new Map([['a', 1], ['b', 2]]);
            expect(Helpers.isIterableCollection(map)).toBe(true);
        });

        it('should return true for Set', () => {
            expect(Helpers.isIterableCollection(new Set())).toBe(true);
        });

        it('should return true for Set with entries', () => {
            expect(Helpers.isIterableCollection(new Set([1, 2, 3]))).toBe(true);
        });

        it('should return false for array', () => {
            expect(Helpers.isIterableCollection([1, 2, 3])).toBe(false);
        });

        it('should return false for plain object', () => {
            expect(Helpers.isIterableCollection({ a: 1 })).toBe(false);
        });

        it('should return false for string', () => {
            expect(Helpers.isIterableCollection('hello')).toBe(false);
        });

        it('should return false for number', () => {
            expect(Helpers.isIterableCollection(42)).toBe(false);
        });

        it('should return false for null', () => {
            expect(Helpers.isIterableCollection(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(Helpers.isIterableCollection(undefined)).toBe(false);
        });

        it('should return false for WeakMap', () => {
            expect(Helpers.isIterableCollection(new WeakMap())).toBe(false);
        });

        it('should return false for WeakSet', () => {
            expect(Helpers.isIterableCollection(new WeakSet())).toBe(false);
        });
    });

    describe('isTypedArray', () => {
        it('should return true for Int8Array', () => {
            expect(Helpers.isTypedArray(new Int8Array(2))).toBe(true);
        });

        it('should return true for Uint8Array / Uint8ClampedArray', () => {
            expect(Helpers.isTypedArray(new Uint8Array(2))).toBe(true);
            expect(Helpers.isTypedArray(new Uint8ClampedArray(2))).toBe(true);
        });

        it('should return true for Int16Array / Uint16Array', () => {
            expect(Helpers.isTypedArray(new Int16Array(2))).toBe(true);
            expect(Helpers.isTypedArray(new Uint16Array(2))).toBe(true);
        });

        it('should return true for Int32Array / Uint32Array', () => {
            expect(Helpers.isTypedArray(new Int32Array(2))).toBe(true);
            expect(Helpers.isTypedArray(new Uint32Array(2))).toBe(true);
        });

        it('should return true for Float32Array / Float64Array', () => {
            expect(Helpers.isTypedArray(new Float32Array(2))).toBe(true);
            expect(Helpers.isTypedArray(new Float64Array(2))).toBe(true);
        });

        it('should return true for BigInt64Array / BigUint64Array', () => {
            expect(Helpers.isTypedArray(new BigInt64Array(2))).toBe(true);
            expect(Helpers.isTypedArray(new BigUint64Array(2))).toBe(true);
        });

        it('should return false for plain Array (typed-array-only check)', () => {
            expect(Helpers.isTypedArray([1, 2, 3])).toBe(false);
        });

        it('should return false for ArrayBuffer / DataView (not strictly typed arrays)', () => {
            expect(Helpers.isTypedArray(new ArrayBuffer(8))).toBe(false);
            expect(Helpers.isTypedArray(new DataView(new ArrayBuffer(8)))).toBe(false);
        });

        it('should return false for null and undefined', () => {
            expect(Helpers.isTypedArray(null)).toBe(false);
            expect(Helpers.isTypedArray(undefined)).toBe(false);
        });

        it('should return false for plain object', () => {
            expect(Helpers.isTypedArray({ length: 2 })).toBe(false);
        });
    });

    describe('isFunction', () => {
        it('should return true for function', () => {
            expect(Helpers.isFunction(() => {})).toBe(true);
        });

        it('should return true for named function', () => {
            function myFn() {}
            expect(Helpers.isFunction(myFn)).toBe(true);
        });

        it('should return false for object', () => {
            expect(Helpers.isFunction({})).toBe(false);
        });
    });

    describe('isSymbol', () => {
        it('should return true for symbol', () => {
            expect(Helpers.isSymbol(Symbol('test'))).toBe(true);
        });

        it('should return false for string', () => {
            expect(Helpers.isSymbol('test')).toBe(false);
        });
    });

    describe('isBigInt', () => {
        it('should return true for BigInt', () => {
            expect(Helpers.isBigInt(BigInt(42))).toBe(true);
        });

        it('should return false for number', () => {
            expect(Helpers.isBigInt(42)).toBe(false);
        });
    });

    describe('isValidElementName', () => {
        it('should return true for "div"', () => {
            expect(Helpers.isValidElementName('div')).toBe(true);
        });

        it('should return true for "my-component"', () => {
            expect(Helpers.isValidElementName('my-component')).toBe(true);
        });

        it('should return false for empty string', () => {
            expect(Helpers.isValidElementName('')).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(Helpers.isValidElementName(undefined as any)).toBe(false);
        });
    });

    describe('isValidCustomElementName', () => {
        it('should return true for "my-component"', () => {
            expect(Helpers.isValidCustomElementName('my-component')).toBe(true);
        });

        it('should return true for "x-app"', () => {
            expect(Helpers.isValidCustomElementName('x-app')).toBe(true);
        });

        it('should return false for "div" (no hyphen)', () => {
            expect(Helpers.isValidCustomElementName('div')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(Helpers.isValidCustomElementName('')).toBe(false);
        });

        it('should return false for "-broken" (hyphen at start)', () => {
            expect(Helpers.isValidCustomElementName('-broken')).toBe(false);
        });
    });

    describe('stringify', () => {
        it('should return the same string for a string input', () => {
            expect(Helpers.stringify('hello')).toBe('hello');
        });

        it('should convert number to string', () => {
            expect(Helpers.stringify(42)).toBe('42');
        });

        it('should convert boolean to string', () => {
            expect(Helpers.stringify(true)).toBe('true');
        });

        it('should return empty string for undefined', () => {
            expect(Helpers.stringify(undefined)).toBe('');
        });

        it('should return empty string for null', () => {
            expect(Helpers.stringify(null)).toBe('');
        });

        it('should JSON.stringify objects', () => {
            expect(Helpers.stringify({ a: 1 })).toBe('{"a":1}');
        });

        it('should JSON.stringify arrays', () => {
            expect(Helpers.stringify([1, 2])).toBe('[1,2]');
        });

        it('should return empty string for symbol', () => {
            expect(Helpers.stringify(Symbol('test'))).toBe('');
        });

        it('should return empty string for function', () => {
            expect(Helpers.stringify(() => {})).toBe('');
        });

        it('should convert bigint to string', () => {
            expect(Helpers.stringify(BigInt(99))).toBe('99');
        });

        it('should return empty string for circular reference', () => {
            const obj: any = { a: 1 };
            obj.self = obj;
            expect(Helpers.stringify(obj)).toBe('');
        });
    });

    describe('fromKebabToCamelCase', () => {
        it('should convert "my-prop" to "myProp"', () => {
            expect(Helpers.fromKebabToCamelCase('my-prop')).toBe('myProp');
        });

        it('should convert "my-long-name" to "myLongName"', () => {
            expect(Helpers.fromKebabToCamelCase('my-long-name')).toBe('myLongName');
        });

        it('should keep single word unchanged', () => {
            expect(Helpers.fromKebabToCamelCase('hello')).toBe('hello');
        });
    });

    describe('fromCamelToKebabCase', () => {
        it('should convert "myProp" to "my-prop"', () => {
            expect(Helpers.fromCamelToKebabCase('myProp')).toBe('my-prop');
        });

        it('should convert "myLongName" to "my-long-name"', () => {
            expect(Helpers.fromCamelToKebabCase('myLongName')).toBe('my-long-name');
        });

        it('should keep single lowercase word unchanged', () => {
            expect(Helpers.fromCamelToKebabCase('hello')).toBe('hello');
        });

        it('should lowercase first char when it is uppercase', () => {
            expect(Helpers.fromCamelToKebabCase('MyProp')).toBe('my-prop');
        });
    });

    describe('toPascalCase', () => {
        it('should capitalize first character', () => {
            expect(Helpers.toPascalCase('myComp')).toBe('MyComp');
        });

        it('should keep already PascalCase unchanged', () => {
            expect(Helpers.toPascalCase('MyComp')).toBe('MyComp');
        });
    });

    describe('toCamelCase', () => {
        it('should lowercase first character', () => {
            expect(Helpers.toCamelCase('MyComp')).toBe('myComp');
        });

        it('should keep already camelCase unchanged', () => {
            expect(Helpers.toCamelCase('myComp')).toBe('myComp');
        });
    });

    describe('equals', () => {
        it('should return true for same primitive values', () => {
            expect(Helpers.equals(1, 1)).toBe(true);
            expect(Helpers.equals('a', 'a')).toBe(true);
            expect(Helpers.equals(true, true)).toBe(true);
        });

        it('should return false for different primitive values', () => {
            expect(Helpers.equals(1, 2)).toBe(false);
            expect(Helpers.equals('a', 'b')).toBe(false);
        });

        it('should return false for different types', () => {
            expect(Helpers.equals(1, '1')).toBe(false);
        });

        it('should deep compare equal objects', () => {
            expect(Helpers.equals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
        });

        it('should return false for objects with different values', () => {
            expect(Helpers.equals({ a: 1 }, { a: 2 })).toBe(false);
        });

        it('should return false for objects with different keys', () => {
            expect(Helpers.equals({ a: 1 }, { b: 1 })).toBe(false);
        });

        it('should return false for objects with different number of keys', () => {
            expect(Helpers.equals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        });

        it('should deep compare nested objects', () => {
            expect(Helpers.equals({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
            expect(Helpers.equals({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
        });

        it('should return true for same reference', () => {
            const obj = { a: 1 };
            expect(Helpers.equals(obj, obj)).toBe(true);
        });

        it('should return false when one is null and other is object', () => {
            expect(Helpers.equals(null, { a: 1 })).toBe(false);
            expect(Helpers.equals({ a: 1 }, null)).toBe(false);
        });

        it('should return true for null vs null', () => {
            expect(Helpers.equals(null, null)).toBe(true);
        });

        it('should deep compare arrays via the array branch', () => {
            expect(Helpers.equals([1, 2, 3], [1, 2, 3])).toBe(true);
            expect(Helpers.equals([1, 2], [1, 2, 3])).toBe(false);
            expect(Helpers.equals([1, 2, 3], [1, 2, 4])).toBe(false);
        });

        it('should deep compare nested arrays', () => {
            expect(Helpers.equals([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
            expect(Helpers.equals([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false);
        });

        it('should treat empty arrays as equal', () => {
            expect(Helpers.equals([], [])).toBe(true);
        });

        it('should differentiate empty array from non-empty array', () => {
            expect(Helpers.equals([], [1])).toBe(false);
        });

        it('should compare objects regardless of key insertion order', () => {
            const a: Record<string, number> = {};
            a.x = 1;
            a.y = 2;

            const b: Record<string, number> = {};
            b.y = 2;
            b.x = 1;

            expect(Helpers.equals(a, b)).toBe(true);
        });

        it('should compare nested objects regardless of key insertion order', () => {
            const a = { outer: { x: 1, y: 2 } };
            const b = { outer: { y: 2, x: 1 } };
            expect(Helpers.equals(a, b)).toBe(true);
        });

        it('should compare objects with same keys but different ordering of nested keys', () => {
            const a = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
            const b = [{ name: 'a', id: 1 }, { name: 'b', id: 2 }];
            expect(Helpers.equals(a, b)).toBe(true);
        });

        it('should return false for undefined vs null', () => {
            expect(Helpers.equals(undefined, null)).toBe(false);
        });

        it('should return true for undefined vs undefined', () => {
            expect(Helpers.equals(undefined, undefined)).toBe(true);
        });

        it('should return false for empty object vs non-empty object', () => {
            expect(Helpers.equals({}, { a: 1 })).toBe(false);
        });

        describe('Date', () => {
            it('should return false for two Date instances with same time', () => {
                expect(Helpers.equals(new Date(2020, 0, 1), new Date(2020, 0, 1))).toBe(false);
            });

            it('should return false for two Date instances with different times', () => {
                expect(Helpers.equals(new Date(2020, 0, 1), new Date(2021, 0, 1))).toBe(false);
            });

            it('should return true for the same Date reference', () => {
                const d = new Date();
                expect(Helpers.equals(d, d)).toBe(true);
            });

            it('should return false when only one side is Date', () => {
                expect(Helpers.equals(new Date(), {})).toBe(false);
                expect(Helpers.equals({}, new Date())).toBe(false);
            });
        });

        describe('RegExp', () => {
            it('should return false for two RegExp with same pattern', () => {
                expect(Helpers.equals(/abc/g, /abc/g)).toBe(false);
            });

            it('should return false for two RegExp with different patterns', () => {
                expect(Helpers.equals(/abc/, /xyz/)).toBe(false);
            });

            it('should return true for same RegExp reference', () => {
                const r = /test/i;
                expect(Helpers.equals(r, r)).toBe(true);
            });

            it('should return false when only one side is RegExp', () => {
                expect(Helpers.equals(/abc/, {})).toBe(false);
                expect(Helpers.equals({}, /abc/)).toBe(false);
            });
        });

        describe('typed arrays', () => {
            it('should deep compare equal Int8Array', () => {
                expect(Helpers.equals(new Int8Array([1, 2, 3]), new Int8Array([1, 2, 3]))).toBe(true);
            });

            it('should differentiate Int8Array with different values', () => {
                expect(Helpers.equals(new Int8Array([1, 2, 3]), new Int8Array([1, 2, 4]))).toBe(false);
            });

            it('should differentiate Int8Array with different lengths', () => {
                expect(Helpers.equals(new Int8Array([1, 2]), new Int8Array([1, 2, 3]))).toBe(false);
            });

            it('should compare empty Int8Array as equal', () => {
                expect(Helpers.equals(new Int8Array(), new Int8Array())).toBe(true);
            });

            it('should deep compare Uint8Array', () => {
                expect(Helpers.equals(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
                expect(Helpers.equals(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
            });

            it('should deep compare Uint8ClampedArray', () => {
                expect(Helpers.equals(new Uint8ClampedArray([1, 2]), new Uint8ClampedArray([1, 2]))).toBe(true);
                expect(Helpers.equals(new Uint8ClampedArray([1, 2]), new Uint8ClampedArray([1, 9]))).toBe(false);
            });

            it('should deep compare Int16Array and Uint16Array', () => {
                expect(Helpers.equals(new Int16Array([100, 200]), new Int16Array([100, 200]))).toBe(true);
                expect(Helpers.equals(new Uint16Array([100]), new Uint16Array([200]))).toBe(false);
            });

            it('should deep compare Int32Array and Uint32Array', () => {
                expect(Helpers.equals(new Int32Array([1000]), new Int32Array([1000]))).toBe(true);
                expect(Helpers.equals(new Uint32Array([1000]), new Uint32Array([2000]))).toBe(false);
            });

            it('should deep compare Float32Array and Float64Array', () => {
                expect(Helpers.equals(new Float32Array([1.5, 2.5]), new Float32Array([1.5, 2.5]))).toBe(true);
                expect(Helpers.equals(new Float64Array([1.5]), new Float64Array([2.5]))).toBe(false);
            });

            it('should deep compare BigInt64Array and BigUint64Array', () => {
                expect(Helpers.equals(new BigInt64Array([1n, 2n]), new BigInt64Array([1n, 2n]))).toBe(true);
                expect(Helpers.equals(new BigUint64Array([1n]), new BigUint64Array([2n]))).toBe(false);
            });

            it('should return false when only one side is a typed array', () => {
                expect(Helpers.equals(new Uint8Array([1, 2]), { 0: 1, 1: 2 })).toBe(false);
                expect(Helpers.equals({}, new Uint8Array([1, 2]))).toBe(false);
            });
        });

        describe('Set', () => {
            it('should deep compare equal Sets', () => {
                expect(Helpers.equals(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
            });

            it('should compare Sets ignoring insertion order', () => {
                expect(Helpers.equals(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true);
            });

            it('should differentiate Sets with different size', () => {
                expect(Helpers.equals(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
            });

            it('should differentiate Sets with same size but different elements', () => {
                expect(Helpers.equals(new Set([1, 2]), new Set([1, 3]))).toBe(false);
            });

            it('should compare empty Sets as equal', () => {
                expect(Helpers.equals(new Set(), new Set())).toBe(true);
            });

            it('should treat Sets containing structurally equal but distinct objects as different (Set.has uses SameValueZero)', () => {
                expect(Helpers.equals(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(false);
            });

            it('should treat Sets sharing the same object reference as equal', () => {
                const obj = { a: 1 };
                expect(Helpers.equals(new Set([obj]), new Set([obj]))).toBe(true);
            });

            it('should return false when comparing a Set to a plain object with matching size', () => {
                expect(Helpers.equals(new Set([1, 2]), { size: 2 })).toBe(false);
            });
        });

        describe('Map', () => {
            it('should deep compare equal Maps', () => {
                expect(Helpers.equals(new Map<string, number>([['a', 1], ['b', 2]]), new Map<string, number>([['a', 1], ['b', 2]]))).toBe(true);
            });

            it('should compare Maps ignoring insertion order', () => {
                expect(Helpers.equals(new Map<string, number>([['a', 1], ['b', 2]]), new Map<string, number>([['b', 2], ['a', 1]]))).toBe(true);
            });

            it('should differentiate Maps with different size', () => {
                expect(Helpers.equals(new Map<string, number>([['a', 1]]), new Map<string, number>([['a', 1], ['b', 2]]))).toBe(false);
            });

            it('should differentiate Maps with different keys', () => {
                expect(Helpers.equals(new Map<string, number>([['a', 1]]), new Map<string, number>([['b', 1]]))).toBe(false);
            });

            it('should differentiate Maps with same keys but different values', () => {
                expect(Helpers.equals(new Map<string, number>([['a', 1]]), new Map<string, number>([['a', 2]]))).toBe(false);
            });

            it('should deeply compare object values inside a Map', () => {
                expect(Helpers.equals(new Map<string, object>([['a', { x: 1 }]]), new Map<string, object>([['a', { x: 1 }]]))).toBe(true);
                expect(Helpers.equals(new Map<string, object>([['a', { x: 1 }]]), new Map<string, object>([['a', { x: 2 }]]))).toBe(false);
            });

            it('should compare empty Maps as equal', () => {
                expect(Helpers.equals(new Map(), new Map())).toBe(true);
            });

            it('should return false when comparing a Map to a plain object', () => {
                expect(Helpers.equals(new Map<string, number>([['a', 1]]), { a: 1 })).toBe(false);
            });
        });

        describe('WeakMap / WeakSet', () => {
            it('should return true for the same WeakMap reference', () => {
                const wm = new WeakMap();
                expect(Helpers.equals(wm, wm)).toBe(true);
            });

            it('should return true for the same WeakSet reference', () => {
                const ws = new WeakSet();
                expect(Helpers.equals(ws, ws)).toBe(true);
            });
        });
    });

    describe('format', () => {
        it('should replace placeholders with args', () => {
            expect(Helpers.format('{0}-{1}', 'hello', 'world')).toBe('hello-world');
        });

        it('should keep placeholder when arg is undefined', () => {
            expect(Helpers.format('{0}-{1}', 'hello')).toBe('hello-{1}');
        });

        it('should replace with empty string when arg is null', () => {
            expect(Helpers.format('{0}', null)).toBe('');
        });

        it('should handle numeric args', () => {
            expect(Helpers.format('{0}', 42)).toBe('42');
        });
    });
});
