import { Properties } from '../../../src/nElement/handlers/Properties';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

describe('Properties handler', () => {
    function createElementWithProp(propName: string, expression: string): Element {
        const el = document.createElement('input');
        el.setAttribute(
            `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${propName}`,
            expression
        );
        return el;
    }

    it('should detect property binding', () => {
        const el = createElementWithProp('value', 'ctx.inputValue');
        const attrs = new Attributes(el);
        const handler = new Properties(el, attrs);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
        expect(handler.nExpression!.has('value')).toBe(true);
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Properties(el, attrs);

        expect(handler.hasNExpression).toBe(false);
    });

    describe('constructor error paths', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        // HTML DOM lowercases attribute names, so camelCase props (className, textContent, etc.)
        // need a mock Attributes that preserves casing to reach the error paths.
        function createMockAttrsForProp(propName: string): Attributes {
            const propKey = `${Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${propName}`;
            return {
                has: (_name: string, _sys?: boolean, _prefix?: boolean) => true,
                getAll: () => new Map<string, string>([[propKey, 'ctx.val']]),
                get: () => undefined
            } as unknown as Attributes;
        }

        it('should log error when using className', () => {
            const el = document.createElement('input');
            new Properties(el, createMockAttrsForProp('className'));

            expect(errorSpy).toHaveBeenCalled();
        });

        it('should log error when using style', () => {
            const el = createElementWithProp('style', 'ctx.val');
            const attrs = new Attributes(el);
            new Properties(el, attrs);

            expect(errorSpy).toHaveBeenCalled();
        });

        it('should log error when using textContent', () => {
            const el = document.createElement('input');
            new Properties(el, createMockAttrsForProp('textContent'));

            expect(errorSpy).toHaveBeenCalled();
        });

        it('should log error when using innerText', () => {
            const el = document.createElement('input');
            new Properties(el, createMockAttrsForProp('innerText'));

            expect(errorSpy).toHaveBeenCalled();
        });

        it('should log error when using innerHTML', () => {
            const el = document.createElement('input');
            new Properties(el, createMockAttrsForProp('innerHTML'));

            expect(errorSpy).toHaveBeenCalled();
        });

        it('should log error for empty property handler name', () => {
            // Use a property name that is valid (not reserved) but has undefined value
            const propKey = `${Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}myProp`;
            const mockAttrs = {
                has: () => true,
                getAll: () => new Map<string, string | undefined>([[propKey, undefined]]),
                get: () => undefined
            } as unknown as Attributes;
            const el = document.createElement('input');
            new Properties(el, mockAttrs);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining("property handler can't be empty"));
        });

        it('should log error for empty property name (no name after prefix)', () => {
            const propKey = `${Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}`;
            const mockAttrs = {
                has: () => true,
                getAll: () => new Map<string, string>([[propKey, 'ctx.val']]),
                get: () => undefined
            } as unknown as Attributes;
            const el = document.createElement('input');
            new Properties(el, mockAttrs);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining("property name can't be empty"));
        });
    });

    // The guard tests above feed a mock Attributes that preserves casing - a shape the real DOM never
    // produces (browsers lowercase attribute names). These drive real elements instead, so they cover
    // both how the sinks actually arrive and that non-blocked names keep their camelCase spelling.
    describe('html sinks and camelCase property names', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        it.each([
            ['innerHTML', 'innerHTML'],
            ['inner-h-t-m-l', 'innerHTML'],
            ['outerHTML', 'outerHTML'],
            ['outer-h-t-m-l', 'outerHTML'],
            ['className', 'className'],
            ['textContent', 'textContent']
        ])('should block nb-prop:%s as delivered by the DOM', (attributeSpelling) => {
            const el = createElementWithProp(attributeSpelling, 'ctx.evil');
            const handler = new Properties(el, new Attributes(el));

            expect(errorSpy).toHaveBeenCalled();
            expect(handler.nExpression === undefined || handler.nExpression.size === 0).toBe(true);
        });

        it('should not write to the DOM for a blocked outerHTML sink', () => {
            const host = document.createElement('div');
            const el = createElementWithProp('outerHTML', 'ctx.evil');
            host.appendChild(el);

            const handler = new Properties(el, new Attributes(el));
            handler.bind(undefined, () => '<img src="x" onerror="alert(1)">');
            handler.commit();

            expect(host.querySelector('img')).toBeNull();
        });

        it('should preserve camelCase when writing a kebab-cased property name', () => {
            const el = createElementWithProp('tab-index', 'ctx.tab');
            const handler = new Properties(el, new Attributes(el));

            expect([...handler.nExpression!.keys()]).toEqual(['tabIndex']);

            handler.bind(undefined, () => 5);
            handler.commit();

            expect((el as HTMLInputElement).tabIndex).toBe(5);
            expect((el as any).tabindex).toBeUndefined();
        });

        // Deliberate: nb-prop is a raw-DOM escape hatch, and srcdoc is the only way to set iframe
        // content through it. It bypasses the htmlSanitizer - an accepted limitation, not an oversight.
        // Blocking it here would be a behaviour change, so this pins the decision.
        it('should allow nb-prop:srcdoc (accepted sanitizer-bypass escape hatch)', () => {
            const el = document.createElement('iframe');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}srcdoc`,
                'ctx.html'
            );
            const handler = new Properties(el, new Attributes(el));

            expect(handler.nExpression!.has('srcdoc')).toBe(true);
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should set the real readOnly property for nb-prop:read-only', () => {
            const el = createElementWithProp('read-only', 'ctx.ro');
            const handler = new Properties(el, new Attributes(el));

            handler.bind(undefined, () => true);
            handler.commit();

            expect((el as HTMLInputElement).readOnly).toBe(true);
            expect(errorSpy).not.toHaveBeenCalled();
        });
    });

    describe('get/set', () => {
        it('should get a property from native element', () => {
            const el = document.createElement('input') as HTMLInputElement;
            el.value = 'myVal';
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            expect(handler.get('value')).toBe('myVal');
        });

        it('should set a property value', () => {
            const el = document.createElement('input');
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            handler.set('value', 'newVal');
            expect(handler.isDirty).toBe(true);
        });

        it('should not mark dirty when setting same value', () => {
            const el = document.createElement('input');
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            handler.set('value', 'test');
            handler.commit();
            handler.set('value', 'test');
            expect(handler.isDirty).toBe(false);
        });
    });

    describe('bind', () => {
        it('should bind expressions to properties', () => {
            const el = createElementWithProp('disabled', 'ctx.isDisabled');
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            handler.bind(undefined, () => true);
            handler.commit();

            expect((el as HTMLInputElement).disabled).toBe(true);
        });

        it('should return executionParams', () => {
            const el = createElementWithProp('value', 'ctx.v');
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            const params = {} as any;
            expect(handler.bind(params, () => 'x')).toBe(params);
        });
    });

    describe('commit', () => {
        it('should apply property changes to element', () => {
            const el = document.createElement('input') as HTMLInputElement;
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            handler.set('value', 'committed');
            handler.commit();

            expect(el.value).toBe('committed');
        });

        it('should return false when not dirty', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            expect(handler.commit()).toBe(false);
        });

        it('should skip native assignment when staged value already equals native', () => {
            const el = document.createElement('input') as HTMLInputElement;
            el.value = 'same';
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            handler.set('value', 'same');
            const result = handler.commit();

            // set marked it dirty, but the native assignment is skipped because
            // `Helpers.equals(value, native[key])` is true, so commit reports no change.
            expect(result).toBe(false);
            expect(el.value).toBe('same');
        });
    });

    describe('bind without expression', () => {
        it('should pass through executionParams unchanged', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Properties(el, attrs);

            const params = { x: 1 } as any;
            expect(handler.bind(params, () => undefined)).toBe(params);
        });
    });
});
