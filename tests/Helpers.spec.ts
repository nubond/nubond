import { Helpers } from '../src/Helpers';
import { Constants } from '../src/Constants';

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

    describe('isPrimitive', () => {
        it.each([
            ['undefined', undefined],
            ['null', null],
            ['a number', 42],
            ['zero', 0],
            ['NaN', NaN],
            ['Infinity', Infinity],
            ['a string', 'hello'],
            ['an empty string', ''],
            ['true', true],
            ['false', false],
            ['a bigint', 10n],
            ['a symbol', Symbol('s')]
        ])('should return true for %s', (_, value) => {
            expect(Helpers.isPrimitive(value)).toBe(true);
        });

        it.each([
            ['a plain object', {}],
            ['an array', []],
            ['a Date', new Date(0)],
            ['a Map', new Map()],
            ['a typed array', new Uint8Array(1)],
            ['a boxed number', new Number(1)],
            ['a boxed string', new String('s')],
            ['a function', function named() {}],
            ['an arrow function', () => 1],
            ['a class', class Some {}],
            ['a class instance', new (class Some {})()]
        ])('should return false for %s', (_, value) => {
            expect(Helpers.isPrimitive(value)).toBe(false);
        });

        it('should return false for a null-prototype object (no Object.prototype in its chain)', () => {
            const dictionary = Object.create(null);
            dictionary.a = 1;

            expect(dictionary instanceof Object).toBe(false);
            expect(Helpers.isPrimitive(dictionary)).toBe(false);
        });

        describe('values from another realm (iframe)', () => {
            let frame: HTMLIFrameElement;
            let frameWindow: any;

            beforeAll(() => {
                frame = document.createElement('iframe');
                document.body.appendChild(frame);
                frameWindow = frame.contentWindow;
            });

            afterAll(() => {
                frame.remove();
            });

            it('should run in a separate realm', () => {
                expect(frameWindow.Object).not.toBe(Object);
            });

            it('should return false for an object from another realm', () => {
                const foreign = frameWindow.eval('({ a: 1 })');

                expect(foreign instanceof Object).toBe(false);
                expect(Helpers.isPrimitive(foreign)).toBe(false);
            });

            it('should return false for an array from another realm', () => {
                expect(Helpers.isPrimitive(frameWindow.eval('[1, 2]'))).toBe(false);
            });

            // known gap: the `instanceof Object` clause is realm-bound and typeof gives 'function',
            // so a function created in another realm is reported as primitive (a same-realm one is not)
            it('should return true for a function from another realm (known gap)', () => {
                const foreign = frameWindow.eval('(function () {})');

                expect(typeof foreign).toBe('function');
                expect(Helpers.isPrimitive(foreign)).toBe(true);
            });
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

        // L-14: JSON.stringify throws for a BigInt or a cycle anywhere inside; stringify retries with a replacer
        // that renders both, and logs only what still fails (a throwing toJSON / getter)
        describe('values JSON.stringify cannot serialize (L-14)', () => {
            let errorSpy: jest.SpyInstance;

            beforeEach(() => {
                errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            });

            afterEach(() => {
                errorSpy.mockRestore();
            });

            it('should render a reference back to the object itself as [circular reference]', () => {
                const obj: any = { a: 1 };
                obj.self = obj;

                expect(Helpers.stringify(obj)).toBe('{"a":1,"self":"[circular reference]"}');   // pre-fix: ''
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should render a parent <-> children model', () => {
                const parent: any = { name: 'list', children: [] };
                parent.children.push({ id: 0, parent }, { id: 1, parent });

                expect(Helpers.stringify(parent))
                    .toBe('{"name":"list","children":[{"id":0,"parent":"[circular reference]"},{"id":1,"parent":"[circular reference]"}]}');
            });

            it('should render a reference back to a middle ancestor as [circular reference]', () => {
                const root: any = { l: { m: {} } };
                root.l.m.back = root.l;

                expect(Helpers.stringify(root)).toBe('{"l":{"m":{"back":"[circular reference]"}}}');
            });

            it('should render a shared (not cyclic) object in full in every place, also on the fallback path', () => {
                const shared = { x: 1 };

                expect(Helpers.stringify({ a: shared, b: shared, n: BigInt(1) })).toBe('{"a":{"x":1},"b":{"x":1},"n":"1"}');
            });

            it('should render siblings correctly after leaving a cyclic branch', () => {
                const root: any = { a: {}, b: { v: BigInt(1) } };
                root.a.up = root;
                root.c = root.b;

                expect(Helpers.stringify(root)).toBe('{"a":{"up":"[circular reference]"},"b":{"v":"1"},"c":{"v":"1"}}');
            });

            it('should render a nested BigInt as its decimal string', () => {
                expect(Helpers.stringify({ users: BigInt(10), list: [BigInt(1), 2] })).toBe('{"users":"10","list":["1",2]}');   // pre-fix: ''
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should render a BigInt returned by toJSON', () => {
                expect(Helpers.stringify({ td: { toJSON: () => ({ inner: BigInt(3) }) } })).toBe('{"td":{"inner":"3"}}');
            });

            it('should keep the plain JSON output for a Date next to a BigInt', () => {
                expect(Helpers.stringify({ d: new Date(0), n: BigInt(2) })).toBe('{"d":"1970-01-01T00:00:00.000Z","n":"2"}');
            });

            it('should return an empty string and log when serialization still fails (a throwing toJSON)', () => {
                const data = { toJSON: () => { throw new Error('boom'); } };

                expect(Helpers.stringify(data)).toBe('');
                expect(errorSpy).toHaveBeenCalledTimes(1);
                expect(errorSpy).toHaveBeenCalledWith(Constants.DISPLAY_NAME + ': ', data,
                                                      expect.stringContaining('stringification failed with exception: Error: boom'));
            });
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
            it('should return true for two Date instances with same time', () => {
                expect(Helpers.equals(new Date(2020, 0, 1), new Date(2020, 0, 1))).toBe(true);
            });

            it('should return false for two Date instances with different times', () => {
                expect(Helpers.equals(new Date(2020, 0, 1), new Date(2021, 0, 1))).toBe(false);
            });

            it('should return true for the same Date reference', () => {
                const d = new Date();
                expect(Helpers.equals(d, d)).toBe(true);
            });

            // R9-2: two Invalid Dates are equal, mirroring the number branch's NaN === NaN handling -
            // otherwise a freshly minted Invalid Date never deep-equals its previous value
            it('should return true for two distinct invalid Date instances (R9-2)', () => {
                expect(Helpers.equals(new Date('invalid'), new Date('invalid'))).toBe(true);
                expect(Helpers.equals(new Date(NaN), new Date('also invalid'))).toBe(true);
            });

            it('should return false for an invalid Date compared with a valid one (R9-2)', () => {
                expect(Helpers.equals(new Date('invalid'), new Date(0))).toBe(false);
                expect(Helpers.equals(new Date(0), new Date('invalid'))).toBe(false);
            });

            it('should return false for an invalid Date compared with NaN or an empty object (R9-2)', () => {
                expect(Helpers.equals(new Date('invalid'), NaN)).toBe(false);
                expect(Helpers.equals(new Date('invalid'), {})).toBe(false);
            });

            it('should compare Invalid Dates nested in objects and arrays (R9-2)', () => {
                expect(Helpers.equals({ d: new Date('x') }, { d: new Date('y') })).toBe(true);
                expect(Helpers.equals([new Date('x'), 1], [new Date('y'), 1])).toBe(true);
                expect(Helpers.equals({ d: new Date('x') }, { d: new Date(0) })).toBe(false);
            });

            it('should return false when only one side is Date', () => {
                expect(Helpers.equals(new Date(), {})).toBe(false);
                expect(Helpers.equals({}, new Date())).toBe(false);
            });
        });

        describe('RegExp', () => {
            it('should return true for two RegExp with same pattern and flags', () => {
                expect(Helpers.equals(/abc/g, /abc/g)).toBe(true);
            });

            it('should return false for two RegExp with different patterns', () => {
                expect(Helpers.equals(/abc/, /xyz/)).toBe(false);
            });

            it('should return false for two RegExp with same pattern but different flags', () => {
                expect(Helpers.equals(/abc/g, /abc/i)).toBe(false);
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

        describe('NaN', () => {
            it('should return true for NaN compared with NaN', () => {
                expect(Helpers.equals(NaN, NaN)).toBe(true);
            });

            it('should return false for NaN compared with a number', () => {
                expect(Helpers.equals(NaN, 1)).toBe(false);
                expect(Helpers.equals(1, NaN)).toBe(false);
            });

            it('should return false for NaN compared with a non-number', () => {
                expect(Helpers.equals(NaN, 'NaN')).toBe(false);
                expect(Helpers.equals(NaN, undefined)).toBe(false);
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

        // L-50: an empty Object.create(null) has no constructor and no keys, and for...in over null
        // is a no-op, so it used to pass as equal to null
        describe('null against a null-prototype object (L-50)', () => {
            it('should not treat an empty null-prototype object as equal to null, in either order', () => {
                expect(Helpers.equals(Object.create(null), null)).toBe(false);   // pre-fix: true
                expect(Helpers.equals(null, Object.create(null))).toBe(false);   // pre-fix: true
            });

            it('should not treat a nested null as equal to an empty null-prototype object', () => {
                expect(Helpers.equals({ a: null }, { a: Object.create(null) })).toBe(false);   // pre-fix: true
                expect(Helpers.equals([null], [Object.create(null)])).toBe(false);             // pre-fix: true
                expect(Helpers.equals(new Map([['k', null]]), new Map([['k', Object.create(null)]]))).toBe(false);   // pre-fix: true
            });

            it('should still treat null as equal to null, also nested', () => {
                expect(Helpers.equals(null, null)).toBe(true);
                expect(Helpers.equals({ a: null }, { a: null })).toBe(true);
                expect(Helpers.equals([null], [null])).toBe(true);
            });

            it('should still compare null-prototype objects with each other by content', () => {
                const full = () => Object.assign(Object.create(null), { a: 1 });

                expect(Helpers.equals(Object.create(null), Object.create(null))).toBe(true);
                expect(Helpers.equals(full(), full())).toBe(true);
                expect(Helpers.equals(full(), Object.assign(Object.create(null), { a: 2 }))).toBe(false);
            });

            it('should still not treat null as equal to undefined or to an empty plain object', () => {
                expect(Helpers.equals(null, undefined)).toBe(false);
                expect(Helpers.equals({}, null)).toBe(false);
                expect(Helpers.equals(null, {})).toBe(false);
            });
        });

        // L-11: wrappers have no enumerable props, so they used to compare equal whatever they held
        describe('Number / Boolean wrapper objects', () => {
            it('should compare Number wrappers by their value', () => {
                expect(Helpers.equals(new Number(5), new Number(5))).toBe(true);
                expect(Helpers.equals(new Number(5), new Number(7))).toBe(false);   // pre-fix: true
            });

            it('should treat NaN wrappers as equal and 0 / -0 wrappers as equal, like the primitives', () => {
                expect(Helpers.equals(new Number(NaN), new Number(NaN))).toBe(true);
                expect(Helpers.equals(new Number(0), new Number(-0))).toBe(true);
                expect(Helpers.equals(new Number(NaN), new Number(1))).toBe(false);
            });

            it('should compare Boolean wrappers by their value', () => {
                expect(Helpers.equals(new Boolean(true), new Boolean(true))).toBe(true);
                expect(Helpers.equals(new Boolean(false), new Boolean(false))).toBe(true);
                expect(Helpers.equals(new Boolean(true), new Boolean(false))).toBe(false);   // pre-fix: true
            });

            it('should not treat a wrapper as equal to its primitive', () => {
                expect(Helpers.equals(new Number(5), 5)).toBe(false);
                expect(Helpers.equals(new Boolean(true), true)).toBe(false);
            });

            it('should compare wrappers nested in objects by value', () => {
                expect(Helpers.equals({ n: new Number(1), b: new Boolean(true) }, { n: new Number(1), b: new Boolean(true) })).toBe(true);
                expect(Helpers.equals({ n: new Number(1) }, { n: new Number(2) })).toBe(false);
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

            // L-9: members not matched by identity are deep-compared, so a Set equals its nb-in
            // structuredClone snapshot (whose member objects are always new)
            it('should treat Sets containing structurally equal but distinct objects as equal (L-9)', () => {
                expect(Helpers.equals(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(true);
            });

            it('should match distinct equal members regardless of insertion order (L-9)', () => {
                expect(Helpers.equals(new Set([{ id: 1 }, { id: 2 }]), new Set([{ id: 2 }, { id: 1 }]))).toBe(true);
            });

            it('should match identity and deep members together in any order (L-9)', () => {
                const shared = { id: 0 };
                expect(Helpers.equals(new Set([shared, { id: 1 }, 2]), new Set([2, { id: 1 }, shared]))).toBe(true);
            });

            it('should differentiate a changed object member (L-9)', () => {
                expect(Helpers.equals(new Set([{ id: 1 }, { id: 2 }]), new Set([{ id: 1 }, { id: 3 }]))).toBe(false);
            });

            it('should not let one member of b be the partner of two members of a (L-9)', () => {
                // without consuming matched partners, both {id:1} members of a would match the single {id:1}
                // of b and {id:2} would never be checked
                expect(Helpers.equals(new Set([{ id: 1 }, { id: 1 }]), new Set([{ id: 1 }, { id: 2 }]))).toBe(false);
                expect(Helpers.equals(new Set([{ id: 1 }, { id: 2 }]), new Set([{ id: 1 }, { id: 1 }]))).toBe(false);
            });

            it('should deep-compare object members that are themselves collections (L-9)', () => {
                expect(Helpers.equals(new Set([[1, 2], new Map([['k', { v: 1 }]])]),
                                      new Set([new Map([['k', { v: 1 }]]), [1, 2]]))).toBe(true);
                expect(Helpers.equals(new Set([[1, 2]]), new Set([[2, 1]]))).toBe(false);
            });

            it('should compare a Set nested in an object with a structurally equal copy (L-9)', () => {
                expect(Helpers.equals({ tags: new Set([{ t: 'a' }]) }, { tags: new Set([{ t: 'a' }]) })).toBe(true);
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

            // L-9 follow-up: keys not matched by identity are deep-matched together with their values,
            // so a Map with object keys equals its nb-in structuredClone snapshot
            it('should treat Maps whose object keys are structurally equal but distinct as equal (L-9)', () => {
                expect(Helpers.equals(new Map([[{ id: 1 }, 'v']]), new Map([[{ id: 1 }, 'v']]))).toBe(true);   // pre-fix: false
            });

            it('should match distinct equal object keys regardless of insertion order (L-9)', () => {
                expect(Helpers.equals(new Map([[{ id: 1 }, 'v'], [{ id: 2 }, 'w']]),
                                      new Map([[{ id: 2 }, 'w'], [{ id: 1 }, 'v']]))).toBe(true);
            });

            it('should match identity and deep keys together in any order (L-9)', () => {
                const shared = { id: 0 };
                expect(Helpers.equals(new Map<any, number>([[shared, 1], [{ id: 1 }, 2], ['k', 3]]),
                                      new Map<any, number>([['k', 3], [{ id: 1 }, 2], [shared, 1]]))).toBe(true);
            });

            it('should differentiate a changed value under a distinct equal object key (L-9)', () => {
                expect(Helpers.equals(new Map([[{ id: 1 }, 'v']]), new Map([[{ id: 1 }, 'CHANGED']]))).toBe(false);
            });

            it('should differentiate a changed object key (L-9)', () => {
                expect(Helpers.equals(new Map([[{ id: 1 }, 'v']]), new Map([[{ id: 2 }, 'v']]))).toBe(false);
            });

            it('should pair equal object keys by their values, not by the first equal key (L-9)', () => {
                // matching keys alone could pair {id:1}->'x' with {id:1}->'y' and report a change that is not there
                expect(Helpers.equals(new Map([[{ id: 1 }, 'x'], [{ id: 1 }, 'y']]),
                                      new Map([[{ id: 1 }, 'y'], [{ id: 1 }, 'x']]))).toBe(true);
            });

            it('should not let one entry of b be the partner of two entries of a (L-9)', () => {
                expect(Helpers.equals(new Map([[{ id: 1 }, 'x'], [{ id: 1 }, 'x']]),
                                      new Map([[{ id: 1 }, 'x'], [{ id: 1 }, 'y']]))).toBe(false);
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

        // L-12: within one equals() call, a pair of objects found equal a second time is cached,
        // so shared substructure is compared at most twice instead of once per path
        describe('shared substructure (L-12)', () => {
            let errorSpy: jest.SpyInstance;

            beforeEach(() => {
                errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            });

            afterEach(() => {
                errorSpy.mockRestore();
            });

            // depth + 1 distinct objects; every level holds the next one twice
            function ladder(depth: number, bottom: number = 0): any {
                let node: any = { value: bottom };
                for (let index = 0; index < depth; index++) {
                    node = { left: node, right: node };
                }
                return node;
            }

            it('should compare a dense DAG in linear time', () => {
                const started = Date.now();

                expect(Helpers.equals(ladder(22), ladder(22))).toBe(true);
                expect(Date.now() - started).toBeLessThan(250);   // pre-fix: ~2.3 s (2^22 visits)
            });

            it('should still find a difference at the bottom of a dense DAG', () => {
                expect(Helpers.equals(ladder(22), ladder(22, 1))).toBe(false);
            });

            it('should not reuse a cached pair for a different partner of the same shared object', () => {
                const shared = { id: 1, nested: { v: 1 } };
                const a = { x: shared, y: shared, z: shared };
                const b = { x: { id: 1, nested: { v: 1 } }, y: { id: 1, nested: { v: 1 } }, z: { id: 1, nested: { v: 2 } } };

                expect(Helpers.equals(a, b)).toBe(false);
            });

            it('should cache per call, not across calls', () => {
                const shared = { id: 1 };
                const a = { x: shared, y: shared, z: shared };

                expect(Helpers.equals(a, { x: { id: 1 }, y: { id: 1 }, z: { id: 1 } })).toBe(true);
                expect(Helpers.equals(a, { x: { id: 1 }, y: { id: 1 }, z: { id: 2 } })).toBe(false);
            });

            it('should not cache the circular-reference shortcut of a pair that is still being compared', () => {
                // comparing x with y meets (x, y) again through `me` and answers true without comparing;
                // the real result is false (v differs). If that shortcut were cached, a later Set candidate
                // search would reuse it and pair the holders of x and y.
                const x: any = { v: 1 };
                x.me = x;
                const y: any = { v: 2 };
                y.me = y;

                const a = new Set([{ k: x }, { k: x }, { k: x }]);
                const b = new Set([{ k: y }, { k: y }, { k: y }]);

                expect(Helpers.equals(a, b)).toBe(false);
            });
        });

        describe('circular references', () => {
            let errorSpy: jest.SpyInstance;

            beforeEach(() => {
                errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            });

            afterEach(() => {
                errorSpy.mockRestore();
            });

            it('should treat two self-referencing objects as equal without throwing or logging (a cycle is a normal model shape, L-13)', () => {
                const a: any = { v: 1 };
                a.self = a;
                const b: any = { v: 1 };
                b.self = b;

                expect(Helpers.equals(a, b)).toBe(true);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should return false when only one side is cyclic', () => {
                const a: any = { v: 1 };
                a.self = a;
                const b: any = { v: 1 };
                b.self = { v: 1 };

                expect(Helpers.equals(a, b)).toBe(false);
            });

            it('should treat two self-referencing arrays as equal without throwing', () => {
                const a: any[] = [1];
                a.push(a);
                const b: any[] = [1];
                b.push(b);

                expect(Helpers.equals(a, b)).toBe(true);
            });

            it('should treat two self-referencing Maps as equal without throwing', () => {
                const a = new Map<string, any>([['v', 1]]);
                a.set('self', a);
                const b = new Map<string, any>([['v', 1]]);
                b.set('self', b);

                expect(Helpers.equals(a, b)).toBe(true);
            });

            it('should not mistake a repeated (shared) object reference for a cycle when values differ', () => {
                const shared = { x: 1 };
                const a = { p: shared, q: shared };
                const b = { p: { x: 1 }, q: { x: 2 } };

                expect(Helpers.equals(a, b)).toBe(false);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should not mistake a repeated (shared) object reference for a cycle when values match', () => {
                const shared = { x: 1 };
                const a = { p: shared, q: shared };
                const b = { p: { x: 1 }, q: { x: 1 } };

                expect(Helpers.equals(a, b)).toBe(true);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should not mistake a repeated (shared) array reference for a cycle when values differ', () => {
                const shared = [1, 2];
                const a = [shared, shared];
                const b = [[1, 2], [1, 3]];

                expect(Helpers.equals(a, b)).toBe(false);
                expect(errorSpy).not.toHaveBeenCalled();
            });
        });

        // L-13: a cycle is recognised by the exact pair (a, b) being compared again, not by a or b alone
        // being on the path; meeting that pair again answers true and the outer comparison decides
        describe('cyclic models (L-13)', () => {
            let errorSpy: jest.SpyInstance;

            beforeEach(() => {
                errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            });

            afterEach(() => {
                errorSpy.mockRestore();
            });

            function parentWithChildren(count: number): any {
                const parent: any = { name: 'list', children: [] };
                for (let index = 0; index < count; index++) {
                    parent.children.push({ id: index, parent });
                }
                return parent;
            }

            it('should compare a parent <-> children model with its copy without logging', () => {
                expect(Helpers.equals(parentWithChildren(50), parentWithChildren(50))).toBe(true);
                expect(errorSpy).not.toHaveBeenCalled();   // pre-fix: one Console.error per child, on every comparison
            });

            it('should still find a changed child in a parent <-> children model', () => {
                const changed = parentWithChildren(50);
                changed.children[49].id = 'x';

                expect(Helpers.equals(parentWithChildren(50), changed)).toBe(false);
            });

            it('should detect a back-pointer moved from the root to the node itself', () => {
                function model(): any {
                    const root: any = { name: 'root', child: null };
                    const child: any = { name: 'child', back: root };
                    root.child = child;
                    return root;
                }

                const live = model();
                live.child.back = live.child;

                expect(Helpers.equals(model(), live)).toBe(false);   // pre-fix: true (root was "on the path")
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should detect a node re-parented from one ancestor to another', () => {
                function model(): any {
                    const root: any = { name: 'root', parent: null };
                    const a: any = { name: 'A', parent: root };
                    const b: any = { name: 'B', parent: a };
                    root.child = a;
                    a.child = b;
                    return root;
                }

                const live = model();
                live.child.child.parent = live;

                expect(Helpers.equals(model(), live)).toBe(false);   // pre-fix: true
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should treat mutually referencing arrays as equal (same infinite shape)', () => {
                const a: any[] = [];
                const b: any[] = [];
                a.push(b);
                b.push(a);

                expect(Helpers.equals([b], [a])).toBe(true);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('should compare shared substructure with a back-pointer to the root on every node in linear time', () => {
                function ladderWithRoot(depth: number, bottom: number = 0): any {
                    const root: any = { name: 'root' };
                    let node: any = { value: bottom, root };
                    for (let index = 0; index < depth; index++) {
                        node = { left: node, right: node, root };
                    }
                    root.top = node;
                    return root;
                }

                const started = Date.now();

                expect(Helpers.equals(ladderWithRoot(20), ladderWithRoot(20))).toBe(true);
                expect(Date.now() - started).toBeLessThan(250);
                expect(Helpers.equals(ladderWithRoot(20), ladderWithRoot(20, 1))).toBe(false);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            describe('a failed Set / Map candidate does not leak what it cached', () => {
                // A and B2 look alike, but A.k1.p is A while Y1.p is B1, and A != B1 (z differs), so A != B2.
                // Comparing A with B1 caches (X, Y1) as equal under the assumption that (A, B1) is equal
                // (X is met twice); B1 then fails on z. If that cache reached the next candidate, A would
                // match B2 through the cached (X, Y1).
                function models(): { A: any, A2: any, B1: any, B2: any } {
                    const X: any = { v: 1 };
                    const A = { k1: X, k2: X, z: 1 };
                    X.p = A;

                    const X2: any = { v: 1 };
                    const A2 = { k1: X2, k2: X2, z: 2 };
                    X2.p = A2;

                    const Y1: any = { v: 1 };
                    const B1 = { k1: Y1, k2: Y1, z: 2 };
                    Y1.p = B1;

                    const B2 = { k1: Y1, k2: Y1, z: 1 };

                    return { A, A2, B1, B2 };
                }

                it('should know A and B2 differ when compared directly', () => {
                    const { A, B2 } = models();

                    expect(Helpers.equals(A, B2)).toBe(false);
                });

                it('should not match a Set member through a pair cached by a failed candidate', () => {
                    const { A, A2, B1, B2 } = models();

                    expect(Helpers.equals(new Set([A, A2]), new Set([B1, B2]))).toBe(false);
                });

                it('should not match a Map entry through a pair cached by a failed candidate', () => {
                    const { A, A2, B1, B2 } = models();

                    // distinct but equal object keys force the candidate search; B1 is tried first for A
                    expect(Helpers.equals(new Map([[{}, A], [{}, A2]]), new Map([[{}, B1], [{}, B2]]))).toBe(false);
                });

                it('should still match Set members and Map entries when the candidates do match', () => {
                    const { A2, B1 } = models();
                    const other = models();

                    expect(Helpers.equals(new Set([other.A, A2]), new Set([B1, models().A]))).toBe(true);
                    expect(Helpers.equals(new Map([[{}, other.A], [{}, A2]]), new Map([[{}, B1], [{}, models().A]]))).toBe(true);
                });
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

    describe('split', () => {
        it('should split on the separator and trim each entry', () => {
            expect(Helpers.split('a; b ; c', ';', '\\')).toEqual(['a', 'b', 'c']);
        });

        it('should drop empty, leading and trailing entries', () => {
            expect(Helpers.split('; a ;; b ;', ';', '\\')).toEqual(['a', 'b']);
        });

        it('should return an empty array for an empty string', () => {
            expect(Helpers.split('', ';', '\\')).toEqual([]);
        });

        it('should return an empty array for a whitespace-only string', () => {
            expect(Helpers.split('   ', ';', '\\')).toEqual([]);
        });

        it('should return an empty array when the value is only separators', () => {
            expect(Helpers.split(';;;', ';', '\\')).toEqual([]);
        });

        it('should keep an escaped separator and strip the escape character', () => {
            expect(Helpers.split('a\\;b; c', ';', '\\')).toEqual(['a;b', 'c']);
        });

        it('should keep an escaped separator when it is the only content', () => {
            expect(Helpers.split('a\\;b', ';', '\\')).toEqual(['a;b']);
        });

        it('should return the whole value when there is no separator', () => {
            expect(Helpers.split('abc', ';', '\\')).toEqual(['abc']);
        });

        it('should keep multiple escaped separators within a single entry', () => {
            expect(Helpers.split('a\\;b\\;c', ';', '\\')).toEqual(['a;b;c']);
        });

        it('should handle an escaped separator at the start of the value', () => {
            expect(Helpers.split('\\;a', ';', '\\')).toEqual([';a']);
        });

        it('should handle a trailing escaped separator', () => {
            expect(Helpers.split('a\\;', ';', '\\')).toEqual(['a;']);
        });

        it('should not support escaping the escape character outside a literal (doubled escape still escapes the separator)', () => {
            // `a\\;b` -> the second backslash is treated as the escape for ';', so the
            // separator is kept and one backslash remains. There is no escape-the-escape:
            // the parts are JavaScript, where `\` before `;` is only valid inside a literal (L-15).
            expect(Helpers.split('a\\\\;b', ';', '\\')).toEqual(['a\\;b']);
        });

        it('should preserve internal whitespace while trimming entry edges', () => {
            expect(Helpers.split('  a b ; c d  ', ';', '\\')).toEqual(['a b', 'c d']);
        });

        it('should return an empty array for a lone separator', () => {
            expect(Helpers.split(';', ';', '\\')).toEqual([]);
        });

        it('should work with arbitrary separator and escape characters', () => {
            expect(Helpers.split('a,b,c', ',', '!')).toEqual(['a', 'b', 'c']);
        });

        it('should honor an arbitrary escape character', () => {
            expect(Helpers.split('a!,b,c', ',', '!')).toEqual(['a,b', 'c']);
        });

        // L-15: the parts are JavaScript expressions (nb-style / nb-class), so a separator inside a
        // '…', "…" or `…` literal is text and the literal keeps its JavaScript escapes
        describe('string literals (L-15)', () => {
            it('should not split on a separator inside single- and double-quoted literals', () => {
                expect(Helpers.split(`content: 'a;b'; color: "it's; ok"`, ';', '\\'))
                    .toEqual([`content: 'a;b'`, `color: "it's; ok"`]);   // pre-fix: 4 broken parts
            });

            it('should not split on a separator inside a template literal, also a tagged one', () => {
                expect(Helpers.split('content: `a;${1 + 1}`; color: red', ';', '\\')).toEqual(['content: `a;${1 + 1}`', 'color: red']);
                expect(Helpers.split('content: this.t`a;b`; color: red', ';', '\\')).toEqual(['content: this.t`a;b`', 'color: red']);
            });

            it('should keep a backslash followed by a separator inside a literal (the L-15 case)', () => {
                const parts = Helpers.split(String.raw`content: 'a\\;b'; color: 'red'`, ';', '\\');

                expect(parts).toEqual([String.raw`content: 'a\\;b'`, `color: 'red'`]);   // pre-fix: 'a\;b', which evaluates to "a;b"
                expect(new Function(`return ${parts[0].substring('content:'.length)}`)()).toBe('a\\;b');
            });

            it('should still drop the escape of an escaped separator inside a literal', () => {
                expect(Helpers.split(String.raw`content: 'a\;b'; color: 'red'`, ';', '\\')).toEqual([`content: 'a;b'`, `color: 'red'`]);
            });

            it('should not close a literal on an escaped quote', () => {
                expect(Helpers.split(String.raw`content: 'it\'s; ok'; x: 1`, ';', '\\')).toEqual([String.raw`content: 'it\'s; ok'`, 'x: 1']);
            });

            it('should close a literal that ends in an escaped backslash', () => {
                expect(Helpers.split(String.raw`content: 'C:\\'; color: 'red'`, ';', '\\')).toEqual([String.raw`content: 'C:\\'`, `color: 'red'`]);
            });

            it('should not open a literal on a quote right after a letter or digit (@ constant text)', () => {
                expect(Helpers.split(`content: @it's; other: @that's`, ';', '\\')).toEqual([`content: @it's`, `other: @that's`]);
                expect(Helpers.split(`width: @5'; height: @6"`, ';', '\\')).toEqual([`width: @5'`, `height: @6"`]);
            });

            it('should split as before when a quote is never closed', () => {
                expect(Helpers.split(`content: @'tis; x: @y`, ';', '\\')).toEqual([`content: @'tis`, 'x: @y']);
            });

            it('should honor literals with an arbitrary separator', () => {
                expect(Helpers.split(`a, 'b,c', d`, ',', '!')).toEqual(['a', `'b,c'`, 'd']);
            });
        });
    });

    describe('isValidIdentifier', () => {
        // #8: transformer / nb-var names become formal parameters of every compiled expression, and
        // ExpressionExecutor compiles the body in strict mode. The probe must therefore mirror the
        // real compile shape — a sloppy-mode probe accepts names that the real path still rejects.
        it.each(['a', 'value', 'myVar', '_private', '$dollar', 'x1', 'ü', '日本'])(
            'should accept %s', (name) => {
            expect(Helpers.isValidIdentifier(name)).toBe(true);
        });

        it.each(['await', 'async', 'of', 'get', 'set', 'undefined', 'NaN'])(
            'should accept the contextual keyword %s', (name) => {
            expect(Helpers.isValidIdentifier(name)).toBe(true);
        });

        it.each(['if', 'class', 'return', 'new', 'typeof', 'delete', 'in', 'instanceof', 'this', 'null', 'true'])(
            'should reject the reserved word %s', (name) => {
            expect(Helpers.isValidIdentifier(name)).toBe(false);
        });

        it.each(['let', 'static', 'public', 'private', 'protected', 'implements', 'interface', 'package', 'yield'])(
            'should reject the strict-mode reserved word %s', (name) => {
            // Valid in sloppy mode, SyntaxError in the strict-mode body the executor compiles.
            expect(Helpers.isValidIdentifier(name)).toBe(false);
        });

        it.each(['eval', 'arguments'])('should reject %s (illegal strict-mode parameter name)', (name) => {
            expect(Helpers.isValidIdentifier(name)).toBe(false);
        });

        it.each(['a=1', '{a}', '[a]', '...a'])(
            'should reject the non-simple parameter form %s', (name) => {
            expect(Helpers.isValidIdentifier(name)).toBe(false);
        });

        it.each(['0abc', 'a b', 'a.b', 'my-transformer', 'a,', 'a\tb', 'a\nb', ''])(
            'should reject %j', (name) => {
            expect(Helpers.isValidIdentifier(name)).toBe(false);
        });

        it('should reject a non-string', () => {
            expect(Helpers.isValidIdentifier(undefined as any)).toBe(false);
            expect(Helpers.isValidIdentifier(null as any)).toBe(false);
            expect(Helpers.isValidIdentifier(42 as any)).toBe(false);
        });
    });
});
