import { Repeat } from '../../../src/nElement/handlers/Repeat';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Classes } from '../../../src/nElement/handlers/Classes';
import { Constants } from '../../../src/Constants';
import { Environment } from '../../../src/Environment';
import { ExecutionParams } from '../../../src/expression/ExpressionExecParamsHelper';

// ExecutionParams is built incrementally (add / addOrReplace); this keeps the specs terse.
function createParams(names: Array<string>, values: Array<any>): ExecutionParams {
    const params = new ExecutionParams();
    names.forEach((name, index) => params.add(name, values[index]));
    return params;
}

describe('Repeat handler', () => {
    const hideClassName = 'nb-hidden';

    function createElements(expression?: string, prefix?: string): { el: Element; attrs: Attributes; classes: Classes } {
        const el = document.createElement('div');
        if (expression !== undefined) {
            const attrName = prefix
                ? `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.REPEAT_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${prefix}`
                : `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.REPEAT_HANDLER_ATTRIBUTE_NAME}`;
            el.setAttribute(attrName, expression);
        }
        const attrs = new Attributes(el, () => false);
        const classes = new Classes(el, attrs, () => hideClassName);
        return { el, attrs, classes };
    }

    const mockClone = jest.fn();
    const mockRemove = jest.fn();
    const getShowDebugInfo = () => false;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect expression from attribute', () => {
        const { el, attrs, classes } = createElements('ctx.items');
        const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression when attribute missing', () => {
        const { el, attrs, classes } = createElements();
        const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should be visible by default', () => {
        const { el, attrs, classes } = createElements('ctx.items');
        const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

        expect(handler.isVisible).toBe(true);
    });

    it('should detect repeat with prefix', () => {
        const { el, attrs, classes } = createElements('ctx.items', 'item');
        const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

        expect(handler.hasNExpression).toBe(true);
    });

    it('isDirty should be false initially', () => {
        const { el, attrs, classes } = createElements('ctx.items');
        const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

        expect(handler.isDirty).toBe(false);
    });

    it('should return executionParams when no expression', () => {
        const { el, attrs, classes } = createElements();
        const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

        const params = { x: 1 } as any;
        expect(handler.bind(params, () => [])).toBe(params);
    });

    describe('bind() with array data', () => {
        it('should request clone when array has more than one item', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ['a', 'b', 'c']);

            expect(mockClone).toHaveBeenCalledTimes(1);
        });

        it('should be visible when array has items', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ['a', 'b']);

            expect(handler.isVisible).toBe(true);
        });

        it('should return execution params with item, index and count', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => ['x', 'y']);

            expect(result).toBeDefined();
            expect(result!.names).toContain('item');
            expect(result!.names).toContain('index');
            expect(result!.names).toContain('count');

            const itemIdx = result!.names.indexOf('item');
            const indexIdx = result!.names.indexOf('index');
            const countIdx = result!.names.indexOf('count');
            expect(result!.values[itemIdx]).toBe('x');
            expect(result!.values[indexIdx]).toBe(0);
            expect(result!.values[countIdx]).toBe(2);
        });

        it('should not request clone for single-item array', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ['only']);

            expect(mockClone).not.toHaveBeenCalled();
        });

        it('should use prefixed param names when prefix is set', () => {
            const { el, attrs, classes } = createElements('ctx.items', 'row');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => ['a', 'b']);

            expect(result).toBeDefined();
            expect(result!.names).toContain('rowItem');
            expect(result!.names).toContain('rowIndex');
            expect(result!.names).toContain('rowCount');
        });
    });

    describe('bind() with number data', () => {
        it('should request clone when number > 1', () => {
            const { el, attrs, classes } = createElements('ctx.count');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => 3);

            expect(mockClone).toHaveBeenCalledTimes(1);
        });

        it('should return execution params with numeric item (1-based)', () => {
            const { el, attrs, classes } = createElements('ctx.count');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => 5);

            expect(result).toBeDefined();
            const itemIdx = result!.names.indexOf('item');
            // repeatIndex is 0, so item = 0 + 1 = 1
            expect(result!.values[itemIdx]).toBe(1);
        });

        it('should not request clone when number is 1', () => {
            const { el, attrs, classes } = createElements('ctx.count');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => 1);

            expect(mockClone).not.toHaveBeenCalled();
        });

        it('should hide element when number is 0', () => {
            const { el, attrs, classes } = createElements('ctx.count');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => 0);

            expect(handler.isVisible).toBe(false);
        });

        it('should hide element when number is negative', () => {
            const { el, attrs, classes } = createElements('ctx.count');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => -5);

            expect(handler.isVisible).toBe(false);
        });
    });

    describe('R4-2: non-finite and fractional repeat counts', () => {
        function bindNumber(value: number) {
            const { el, attrs, classes } = createElements('ctx.count');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);
            const result = handler.bind(undefined, () => value);
            return { handler, result };
        }

        function countOf(result: ReturnType<typeof bindNumber>['result']) {
            return result!.values[result!.names.indexOf('count')];
        }

        it('should not request a clone when number is Infinity', () => {
            const { handler } = bindNumber(Infinity);

            // Infinity used to pass the `> 0` check, making every element request the next clone forever.
            expect(mockClone).not.toHaveBeenCalled();
            expect(handler.isVisible).toBe(false);
        });

        it('should reject Infinity as repeat data (count stays at the no-data value)', () => {
            const { result } = bindNumber(Infinity);

            expect(countOf(result)).toBe(-1);
        });

        it('should not request a clone when number is -Infinity', () => {
            const { handler } = bindNumber(-Infinity);

            expect(mockClone).not.toHaveBeenCalled();
            expect(handler.isVisible).toBe(false);
        });

        it('should not request a clone when number is NaN', () => {
            const { handler } = bindNumber(NaN);

            expect(mockClone).not.toHaveBeenCalled();
            expect(handler.isVisible).toBe(false);
        });

        it('should hide element when number floors to zero', () => {
            const { handler, result } = bindNumber(0.5);

            // 0 < n < 1 floors to 0 and is rejected, exactly like a plain 0
            expect(handler.isVisible).toBe(false);
            expect(mockClone).not.toHaveBeenCalled();
            expect(countOf(result)).toBe(-1);
        });

        it('should floor a fractional number above one', () => {
            const { handler, result } = bindNumber(3.7);

            expect(handler.isVisible).toBe(true);
            expect(mockClone).toHaveBeenCalledTimes(1);
            expect(countOf(result)).toBe(3);
        });

        it('should accept any finite number — there is no sanity cap', () => {
            const { handler, result } = bindNumber(Number.MAX_SAFE_INTEGER);

            expect(handler.isVisible).toBe(true);
            expect(countOf(result)).toBe(Number.MAX_SAFE_INTEGER);
        });
    });

    describe('bind() with null/undefined data', () => {
        it('should hide element when data is null', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => null);

            expect(handler.isVisible).toBe(false);
        });

        it('should hide element when data is undefined', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => undefined);

            expect(handler.isVisible).toBe(false);
        });
    });

    describe('bind() with Map data', () => {
        it('should request clone when Map has more than one entry', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Map([['a', 1], ['b', 2]]));

            expect(mockClone).toHaveBeenCalledTimes(1);
        });

        it('should be visible when Map has entries', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Map([['a', 1]]));

            expect(handler.isVisible).toBe(true);
        });

        it('should return execution params with first entry as item', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new Map([['key1', 'val1'], ['key2', 'val2']]));

            expect(result).toBeDefined();
            const itemIdx = result!.names.indexOf('item');
            const countIdx = result!.names.indexOf('count');
            // Map is converted to Array via Array.from, so item is [key, value] entry
            expect(result!.values[itemIdx]).toEqual(['key1', 'val1']);
            expect(result!.values[countIdx]).toBe(2);
        });

        it('should not request clone for single-entry Map', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Map([['only', 1]]));

            expect(mockClone).not.toHaveBeenCalled();
        });

        it('should hide element when Map is empty', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Map());

            expect(handler.isVisible).toBe(false);
        });

        it('should use Map.size for count', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new Map([['a', 1], ['b', 2], ['c', 3]]));

            expect(result).toBeDefined();
            const countIdx = result!.names.indexOf('count');
            expect(result!.values[countIdx]).toBe(3);
        });

        it('should use prefixed param names with Map data', () => {
            const { el, attrs, classes } = createElements('ctx.items', 'entry');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new Map([['a', 1], ['b', 2]]));

            expect(result).toBeDefined();
            expect(result!.names).toContain('entryItem');
            expect(result!.names).toContain('entryIndex');
            expect(result!.names).toContain('entryCount');
        });
    });

    describe('bind() with Set data', () => {
        it('should request clone when Set has more than one item', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Set(['a', 'b', 'c']));

            expect(mockClone).toHaveBeenCalledTimes(1);
        });

        it('should be visible when Set has entries', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Set([1]));

            expect(handler.isVisible).toBe(true);
        });

        it('should return execution params with first value as item', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new Set(['first', 'second']));

            expect(result).toBeDefined();
            const itemIdx = result!.names.indexOf('item');
            const countIdx = result!.names.indexOf('count');
            expect(result!.values[itemIdx]).toBe('first');
            expect(result!.values[countIdx]).toBe(2);
        });

        it('should not request clone for single-item Set', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Set(['only']));

            expect(mockClone).not.toHaveBeenCalled();
        });

        it('should hide element when Set is empty', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Set());

            expect(handler.isVisible).toBe(false);
        });

        it('should use Set.size for count', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new Set([10, 20, 30, 40]));

            expect(result).toBeDefined();
            const countIdx = result!.names.indexOf('count');
            expect(result!.values[countIdx]).toBe(4);
        });

        it('should use prefixed param names with Set data', () => {
            const { el, attrs, classes } = createElements('ctx.items', 'val');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new Set(['a', 'b']));

            expect(result).toBeDefined();
            expect(result!.names).toContain('valItem');
            expect(result!.names).toContain('valIndex');
            expect(result!.names).toContain('valCount');
        });
    });

    describe('showDebugInfo branch', () => {
        it('should log a low-performance warning for plain object data when showDebugInfo is true', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            try {
                const { el, attrs, classes } = createElements('ctx.obj');
                const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, () => true);

                handler.bind(undefined, () => ({ a: 1, b: 2 }));

                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    `${Constants.DISPLAY_NAME}: `,
                    el,
                    expect.stringContaining('Low performance for repeat expression'),
                    { a: 1, b: 2 }
                );
            } finally {
                consoleWarnSpy.mockRestore();
            }
        });
    });

    describe('bind() with object data', () => {
        it('should request clone when object has more than one property', () => {
            const { el, attrs, classes } = createElements('ctx.obj');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ({ a: 1, b: 2 }));

            expect(mockClone).toHaveBeenCalledTimes(1);
        });

        it('should return execution params with first property value as item', () => {
            const { el, attrs, classes } = createElements('ctx.obj');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => ({ name: 'Alice', age: 30 }));

            expect(result).toBeDefined();
            const itemIdx = result!.names.indexOf('item');
            expect(result!.values[itemIdx]).toBe('Alice');
        });

        it('should not request clone for single-property object', () => {
            const { el, attrs, classes } = createElements('ctx.obj');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ({ only: 'one' }));

            expect(mockClone).not.toHaveBeenCalled();
        });

        it('should hide element when object is empty', () => {
            const { el, attrs, classes } = createElements('ctx.obj');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ({}));

            expect(handler.isVisible).toBe(false);
        });
    });

    describe('commit()', () => {
        it('should call markAsReady on first commit', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            // bind to make dirty
            handler.bind(undefined, () => ['a']);
            const readyAttr = `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.REPEAT_HANDLER_ATTRIBUTE_NAME}${Constants.DEFAULT_SEPARATOR}${Constants.HANDLER_READY_ATTRIBUTE_SUFFIX}`;

            handler.commit();

            // markAsReady sets a ready attribute via Attributes
            expect(el.hasAttribute(readyAttr)).toBe(false); // ready attr is tracked internally in Attributes, commit on Attributes would flush it
            // We verify markAsReady was called by checking Attributes isDirty was set
            expect(attrs.isDirty).toBe(true);
        });

        it('should return true when visibility changes on commit', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            // empty data hides the index-0 element (visible -> hidden), so commit
            // flushes a class change and reports it.
            handler.bind(undefined, () => []);
            expect(handler.commit()).toBe(true);
        });

        it('should return false when not dirty', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            expect(handler.commit()).toBe(false);
        });

        it('should not be dirty after commit', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ['a']);
            handler.commit();

            expect(handler.isDirty).toBe(false);
        });

        it('should add hide class when visibility changes to hidden', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => null);
            handler.commit();
            classes.commit();

            expect(el.classList.contains(hideClassName)).toBe(true);
        });

        it('should remove hide class when visibility changes to visible', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            // First: hide
            handler.bind(undefined, () => null);
            handler.commit();
            // commit classes too so the hide class is flushed to the DOM
            classes.commit();
            expect(el.classList.contains(hideClassName)).toBe(true);

            // Then: show
            handler.bind(undefined, () => ['a']);
            handler.commit();
            classes.commit();
            expect(el.classList.contains(hideClassName)).toBe(false);
        });

        it('should not call markAsReady on second commit', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ['a']);
            handler.commit();

            // Reset attrs dirty flag by committing attrs
            attrs.commit();
            expect(attrs.isDirty).toBe(false);

            // Second bind+commit should not set markAsReady again
            handler.bind(undefined, () => ['b']);
            handler.commit();

            // Attrs should not be dirtied by markAsReady a second time
            expect(attrs.isDirty).toBe(false);
        });
    });

    describe('clone request handling', () => {
        it('should request clone only once for multi-item array', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => ['a', 'b', 'c']);
            expect(mockClone).toHaveBeenCalledTimes(1);

            // Second bind should not request another clone (hasClone is true)
            handler.bind(undefined, () => ['x', 'y', 'z']);
            expect(mockClone).toHaveBeenCalledTimes(1);
        });
    });

    describe('removal request (clone context)', () => {
        it('should request removal when clone repeatIndex exceeds data length', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const original = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            // First bind with 2 items forces clone request
            original.bind(undefined, () => ['a', 'b']);
            expect(mockClone).toHaveBeenCalledTimes(1);

            // Create a clone (repeatIndex=1)
            const { el: cloneEl, attrs: cloneAttrs, classes: cloneClasses } = createElements('ctx.items');
            const mockCloneRemove = jest.fn();
            const clone = new Repeat(cloneEl, cloneAttrs, cloneClasses, jest.fn(), mockCloneRemove, getShowDebugInfo, original);

            // Now bind original with only 1 item - clone's index (1) exceeds totalCount (1)
            original.bind(undefined, () => ['a']);
            // Clone's bind uses the parent's data source
            clone.bind(undefined, () => ['a']);

            expect(mockCloneRemove).toHaveBeenCalledTimes(1);
        });

        it('clone should get correct item from array at its repeatIndex', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const original = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            original.bind(undefined, () => ['first', 'second', 'third']);

            const { el: cloneEl, attrs: cloneAttrs, classes: cloneClasses } = createElements('ctx.items');
            const clone = new Repeat(cloneEl, cloneAttrs, cloneClasses, jest.fn(), jest.fn(), getShowDebugInfo, original);

            const result = clone.bind(undefined, () => ['first', 'second', 'third']);

            expect(result).toBeDefined();
            const itemIdx = result!.names.indexOf('item');
            const indexIdx = result!.names.indexOf('index');
            expect(result!.values[itemIdx]).toBe('second');
            expect(result!.values[indexIdx]).toBe(1);
        });
    });

    describe('R4-4: repeat prefix must be a valid identifier', () => {
        // The prefix builds the formal parameter names of every compiled expression in the subtree
        // (`prefixItem` / `prefixIndex` / `prefixCount`), and expression bodies compile in strict mode.
        // An unusable prefix must disable this handler rather than break compilation downstream.
        const invalidPrefixes = [
            'my-2nd',      // kebab remnant: fromKebabToCamelCase only rewrites `-[a-z]`
            'foo:bar',     // the attribute parser happily produces this
            '2nd',         // cannot start with a digit
            'let',         // strict-mode-only reserved word
            'eval',        // illegal strict-mode parameter name
        ];

        it.each(invalidPrefixes)('should refuse to bind with prefix %s', (prefix) => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const { el, attrs, classes } = createElements('ctx.items', prefix);
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            expect(handler.hasNExpression).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                el,
                expect.stringContaining('is not a valid identifier')
            );
            consoleSpy.mockRestore();
        });

        it('should leave the incoming execution params untouched when the prefix is invalid', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const { el, attrs, classes } = createElements('ctx.items', 'my-2nd');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);
            const params = { names: ['outer'], values: ['kept'] } as any;

            // The subtree keeps compiling: no `my-2nd` parameter is ever contributed.
            expect(handler.bind(params, () => ['a', 'b'])).toBe(params);
            expect(mockClone).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should bind normally with a valid prefix', () => {
            const { el, attrs, classes } = createElements('ctx.items', 'row');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => ['a', 'b']);

            expect(handler.hasNExpression).toBe(true);
            expect(result!.names).toEqual(expect.arrayContaining(['rowItem', 'rowIndex', 'rowCount']));
        });
    });

    describe('prefix conflict with transformer', () => {
        // `names` / `functions` are ReadonlyArrays; reach for the live mutable arrays via the private fields
        // so these tests can install and tear down a fake transformer entry without polluting the
        // Environment singleton across tests.
        const getMutableTransformerArrays = () => ({
            transformerNames: (Environment.transformers as any)._names as Array<string>,
            transformerFns: (Environment.transformers as any)._functions as Array<(...args: any[]) => any>,
        });

        it('should refuse to bind when prefixItem collides with a registered transformer', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const { transformerNames, transformerFns } = getMutableTransformerArrays();
            // Repeat's conflict check looks up `${prefix}${PascalCase(item|index|count)}`.
            // With prefix `row`, the colliding name is `rowItem`.
            transformerNames.push('rowItem');
            transformerFns.push(() => 'whatever');

            try {
                const { el, attrs, classes } = createElements('ctx.items', 'row');
                const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

                expect(handler.hasNExpression).toBe(false);
                expect(consoleSpy).toHaveBeenCalledWith(
                    `${Constants.DISPLAY_NAME}: `,
                    el,
                    expect.stringContaining("conflicting with rowItem transformer")
                );
            } finally {
                transformerNames.pop();
                transformerFns.pop();
                consoleSpy.mockRestore();
            }
        });

        it('should refuse to bind when prefixIndex collides with a registered transformer', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const { transformerNames, transformerFns } = getMutableTransformerArrays();
            transformerNames.push('rowIndex');
            transformerFns.push(() => 'whatever');

            try {
                const { el, attrs, classes } = createElements('ctx.items', 'row');
                const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

                expect(handler.hasNExpression).toBe(false);
            } finally {
                transformerNames.pop();
                transformerFns.pop();
                consoleSpy.mockRestore();
            }
        });

        it('should still bind when transformer name does not match any of the prefixed param names', () => {
            const { transformerNames, transformerFns } = getMutableTransformerArrays();
            transformerNames.push('unrelated');
            transformerFns.push(() => 'whatever');

            try {
                const { el, attrs, classes } = createElements('ctx.items', 'row');
                const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

                expect(handler.hasNExpression).toBe(true);
            } finally {
                transformerNames.pop();
                transformerFns.pop();
            }
        });

        it('should bind without conflict check when no prefix is set', () => {
            // Without prefix, repeat exposes the bare names `item`/`index`/`count` —
            // those are reserved (validated elsewhere) so the prefix-vs-transformer
            // check is skipped entirely; binding succeeds even with `item` registered.
            const { transformerNames, transformerFns } = getMutableTransformerArrays();
            transformerNames.push('item');
            transformerFns.push(() => 'whatever');

            try {
                const { el, attrs, classes } = createElements('ctx.items');
                const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

                expect(handler.hasNExpression).toBe(true);
            } finally {
                transformerNames.pop();
                transformerFns.pop();
            }
        });
    });

    describe('single-bind expression', () => {
        it('should only execute expression once for single-bind', () => {
            const { el, attrs, classes } = createElements('#ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const mockExec = jest.fn().mockReturnValue(['a', 'b']);
            handler.bind(undefined, mockExec);
            handler.bind(undefined, mockExec);

            // Expression should be evaluated only once due to single-bind cache
            expect(mockExec).toHaveBeenCalledTimes(1);
        });

        it('should use cached execution params on subsequent binds', () => {
            const { el, attrs, classes } = createElements('#ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const mockExec = jest.fn().mockReturnValue(['a', 'b']);
            const result1 = handler.bind(undefined, mockExec);
            const result2 = handler.bind(undefined, mockExec);

            // Both should return valid execution params
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(result2!.names).toContain('item');
        });
    });

    describe('R2-5: single-bind repeat must not freeze the outer scope', () => {
        // A '#' repeat freezes its own DATA SOURCE, not the scope it lives in.
        // The skip path used to return a stored ExecutionParams snapshot, and because
        // createOrExtendRepeatParams builds that snapshot by COPYING the incoming outer
        // params, the snapshot also pinned the enclosing nb-repeat / nb-var values.
        function outerParams(label: string): ExecutionParams {
            return createParams(['label'], [label]);
        }

        function valueOf(params: ExecutionParams | undefined, name: string): any {
            const index = params!.names.indexOf(name);
            return index >= 0 ? params!.values[index] : undefined;
        }

        it('should propagate the fresh outer scope on the single-bind skip path', () => {
            const { el, attrs, classes } = createElements('#ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const mockExec = jest.fn().mockReturnValue(['a', 'b']);

            const first = handler.bind(outerParams('outer-1'), mockExec);
            expect(valueOf(first, 'label')).toBe('outer-1');

            const second = handler.bind(outerParams('outer-2'), mockExec);

            // the expression is still evaluated only once...
            expect(mockExec).toHaveBeenCalledTimes(1);
            // ...but the outer scope must be this cycle's, not the first cycle's
            expect(valueOf(second, 'label')).toBe('outer-2');
        });

        it('should keep item, index and count frozen while the outer scope moves', () => {
            const { el, attrs, classes } = createElements('#ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            // a changed data source must be ignored by '#'
            const mockExec = jest.fn()
                                 .mockReturnValueOnce(['a', 'b'])
                                 .mockReturnValue(['x', 'y', 'z']);

            handler.bind(outerParams('outer-1'), mockExec);
            const second = handler.bind(outerParams('outer-2'), mockExec);

            expect(valueOf(second, Constants.ITEM_EXECUTION_PARAM_NAME)).toBe('a');
            expect(valueOf(second, Constants.INDEX_EXECUTION_PARAM_NAME)).toBe(0);
            expect(valueOf(second, Constants.TOTAL_COUNT_EXECUTION_PARAM_NAME)).toBe(2);
            expect(valueOf(second, 'label')).toBe('outer-2');
        });

        it('should propagate the fresh outer scope for a prefixed single-bind repeat', () => {
            const { el, attrs, classes } = createElements('#ctx.items', 'row');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const mockExec = jest.fn().mockReturnValue(['a', 'b']);

            handler.bind(outerParams('outer-1'), mockExec);
            const second = handler.bind(outerParams('outer-2'), mockExec);

            expect(valueOf(second, 'label')).toBe('outer-2');
            expect(valueOf(second, 'rowItem')).toBe('a');
            expect(valueOf(second, 'rowIndex')).toBe(0);
            expect(valueOf(second, 'rowCount')).toBe(2);
        });

        it('should not resurrect a stale outer value when the outer param disappears', () => {
            const { el, attrs, classes } = createElements('#ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const mockExec = jest.fn().mockReturnValue(['a', 'b']);

            handler.bind(outerParams('outer-1'), mockExec);
            const second = handler.bind(undefined, mockExec);

            expect(second!.names).not.toContain('label');
            expect(valueOf(second, Constants.ITEM_EXECUTION_PARAM_NAME)).toBe('a');
        });

        it('should keep a frozen item that is no longer reachable from the data source', () => {
            const { el, attrs, classes } = createElements('#ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const original = { v: 1 };
            const mockExec = jest.fn()
                                 .mockReturnValueOnce([original, { v: 2 }])
                                 .mockReturnValue([{ v: 9 }, { v: 8 }]);

            handler.bind(outerParams('outer-1'), mockExec);
            const second = handler.bind(outerParams('outer-2'), mockExec);

            // identity, not just shape - the item is remembered, not re-read
            expect(valueOf(second, Constants.ITEM_EXECUTION_PARAM_NAME)).toBe(original);
        });
    });

    describe('typed-array data (commit 7f359c3)', () => {
        it('should treat Int8Array as array-like (clone requested, visible)', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            handler.bind(undefined, () => new Int8Array([1, 2, 3]));

            // Mirrors plain-array semantics: clone requested for length > 1, element stays visible.
            expect(mockClone).toHaveBeenCalled();
            expect(handler.isVisible).toBe(true);
        });

        it('should expose typed-array length as count', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new Float32Array([10, 20]));
            const countIdx = result!.names.indexOf('count');
            expect(result!.values[countIdx]).toBe(2);
        });

        it('should support BigInt64Array as array-like', () => {
            const { el, attrs, classes } = createElements('ctx.items');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new BigInt64Array([1n, 2n, 3n]));
            expect(result).toBeDefined();
            const itemIdx = result!.names.indexOf('item');
            expect(result!.values[itemIdx]).toBe(1n);
        });
    });

    describe('M-26: plain-object enumeration uses own keys only', () => {
        it('should NOT iterate prototype-chain methods of a class instance', () => {
            class WithMethods {
                a = 1;
                b = 2;
                doSomething() { return 'method'; }
                doAnother() { return 'method2'; }
            }

            const { el, attrs, classes } = createElements('ctx.obj');
            const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, getShowDebugInfo);

            const result = handler.bind(undefined, () => new WithMethods());

            // 2 own enumerable fields, NOT 4 (methods on prototype must not surface as rows).
            const countIdx = result!.names.indexOf('count');
            expect(result!.values[countIdx]).toBe(2);
        });
    });

    describe('M-27: debug warning survives cyclic objects', () => {
        it('should not throw when warning about a cyclic plain object', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            try {
                const cyclic: any = { name: 'root' };
                cyclic.self = cyclic;

                const { el, attrs, classes } = createElements('ctx.obj');
                const handler = new Repeat(el, attrs, classes, mockClone, mockRemove, () => true);

                expect(() => handler.bind(undefined, () => cyclic)).not.toThrow();
                expect(consoleWarnSpy).toHaveBeenCalled();
            } finally {
                consoleWarnSpy.mockRestore();
            }
        });
    });
});
