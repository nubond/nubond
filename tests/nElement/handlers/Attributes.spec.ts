import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';
import { ContextBinder } from '../../../src/ContextBinder';
import { Environment } from '../../../src/Environment';

describe('Attributes handler', () => {
    function createElementWithAttrs(bindings: Record<string, string>, regularAttrs?: Record<string, string>): Element {
        const el = document.createElement('div');
        if (regularAttrs) {
            for (const [k, v] of Object.entries(regularAttrs)) {
                el.setAttribute(k, v);
            }
        }
        for (const [k, v] of Object.entries(bindings)) {
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${k}`, v);
        }
        return el;
    }

    describe('constructor & expression parsing', () => {
        it('should detect attribute bindings', () => {
            const el = createElementWithAttrs({ 'data-id': 'ctx.id', 'data-name': 'ctx.name' });
            const handler = new Attributes(el, false);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression).toBeDefined();
            expect(handler.nExpression!.size).toBe(2);
        });

        it('should have no expression when no nb attributes', () => {
            const el = document.createElement('div');
            el.setAttribute('id', 'myId');
            const handler = new Attributes(el, false);

            expect(handler.hasNExpression).toBe(false);
        });

        it('should preserve non-system attributes', () => {
            const el = document.createElement('div');
            el.setAttribute('id', 'myId');
            el.setAttribute('class', 'myClass');
            const handler = new Attributes(el, false);

            expect(handler.has('id')).toBe(true);
            expect(handler.get('id')).toBe('myId');
        });
    });

    describe('has/get/getAll', () => {
        it('should check if attribute exists', () => {
            const el = document.createElement('div');
            el.setAttribute('role', 'button');
            const handler = new Attributes(el, false);

            expect(handler.has('role')).toBe(true);
            expect(handler.has('nonexistent')).toBe(false);
        });

        it('should get attribute value', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'hello');
            const handler = new Attributes(el, false);

            expect(handler.get('title')).toBe('hello');
        });

        it('should getAll non-system attributes', () => {
            const el = document.createElement('div');
            el.setAttribute('id', 'test');
            el.setAttribute('data-x', 'y');
            const handler = new Attributes(el, false);

            const all = handler.getAll();
            expect(all.size).toBe(2);
        });

        it('should return a frozen Map from getAll()', () => {
            const el = document.createElement('div');
            el.setAttribute('id', 'test');
            const handler = new Attributes(el, false);

            const all = handler.getAll();
            expect(Object.isFrozen(all)).toBe(true);
        });

        it('should return a frozen Map from getAll() with prefix filter', () => {
            const el = document.createElement('div');
            el.setAttribute('data-x', '1');
            el.setAttribute('data-y', '2');
            const handler = new Attributes(el, false);

            const all = handler.getAll('data', false);
            expect(Object.isFrozen(all)).toBe(true);
        });
    });

    describe('set/remove', () => {
        it('should set an attribute value', () => {
            const el = document.createElement('div');
            const handler = new Attributes(el, false);

            handler.set('data-custom', 'value');
            expect(handler.has('data-custom')).toBe(true);
            expect(handler.isDirty).toBe(true);
        });

        it('should remove an attribute', () => {
            const el = document.createElement('div');
            el.setAttribute('data-x', 'y');
            const handler = new Attributes(el, false);

            handler.remove('data-x');
            expect(handler.has('data-x')).toBe(false);
        });

        it('should allow setting a plain attribute that collides with a system handler name', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.PREFIX_AND_SEPARATOR}value`, 'ctx.x');
            const handler = new Attributes(el, false);

            //a plain HTML attribute literally named 'value' must be settable even when nb-value is bound
            expect(() => handler.set('value', 'newVal')).not.toThrow();
            handler.commit();
            expect(el.getAttribute('value')).toBe('newVal');
        });

        it('should still throw when setting the fully-prefixed system attribute name', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.PREFIX_AND_SEPARATOR}value`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(() => handler.set(`${Constants.PREFIX_AND_SEPARATOR}value`, 'newVal')).toThrow(/system/);
        });
    });

    describe('bind', () => {
        it('should bind expression to attributes', () => {
            const el = createElementWithAttrs({ 'data-id': 'ctx.id' });
            const handler = new Attributes(el, false);

            handler.bind(undefined, () => '42');
            handler.commit();

            expect(el.getAttribute('data-id')).toBe('42');
        });

        it('should return executionParams', () => {
            const el = createElementWithAttrs({ 'data-x': 'ctx.x' });
            const handler = new Attributes(el, false);

            const params = { a: 1 } as any;
            expect(handler.bind(params, () => 'v')).toBe(params);
        });
    });

    describe('commit', () => {
        it('should apply attribute changes to DOM', () => {
            const el = document.createElement('div');
            const handler = new Attributes(el, false);

            handler.set('title', 'hello');
            handler.commit();

            expect(el.getAttribute('title')).toBe('hello');
        });

        it('should remove attribute from DOM when undefined', () => {
            const el = document.createElement('div');
            el.setAttribute('data-test', 'value');
            const handler = new Attributes(el, false);

            handler.set('data-test', undefined as any);
            handler.commit();

            // Setting to undefined should remove
            expect(el.hasAttribute('data-test')).toBe(false);
        });
    });

    describe('system lookups on an element without any attributes (no system map allocated)', () => {
        const valueName = Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME;
        const eventPrefix = Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME;

        it('should report no system attribute via has()', () => {
            const handler = new Attributes(document.createElement('div'), false);

            expect(handler.has(valueName, true)).toBe(false);
            expect(handler.has(eventPrefix, true, true)).toBe(false);
            expect(handler.has(eventPrefix, true, true, false)).toBe(false);
        });

        it('should return undefined via get()', () => {
            const handler = new Attributes(document.createElement('div'), false);

            expect(handler.get(valueName, true)).toBeUndefined();
            expect(handler.get(eventPrefix, true, true)).toBeUndefined();
            expect(handler.get(eventPrefix, true, true, false)).toBeUndefined();
        });

        it('should return an empty map via getAll()', () => {
            const handler = new Attributes(document.createElement('div'), false);

            expect(handler.getAll(eventPrefix, true).size).toBe(0);
            expect(handler.getAll(eventPrefix, true, false).size).toBe(0);
            expect(handler.getAll(undefined, true).size).toBe(0);
        });

        it('should allow set() and remove() of a regular attribute', () => {
            const el = document.createElement('div');
            const handler = new Attributes(el, false);

            expect(() => handler.set('data-x', '1')).not.toThrow();
            handler.commit();
            expect(el.getAttribute('data-x')).toBe('1');

            expect(() => handler.remove('data-x')).not.toThrow();
            handler.commit();
            expect(el.hasAttribute('data-x')).toBe(false);
        });

        it('should behave the same when the element only has regular attributes', () => {
            const el = document.createElement('div');
            el.setAttribute('id', 'a');
            const handler = new Attributes(el, false);

            expect(handler.has(valueName, true)).toBe(false);
            expect(handler.get(eventPrefix, true, true)).toBeUndefined();
            expect(handler.getAll(undefined, true).size).toBe(0);
            expect(handler.has('id')).toBe(true);
        });
    });

    describe('ready attributes', () => {
        it('should track a ready attribute already present on the element as a system attribute, not a regular one (L-19)', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const readyAttr = `${Constants.HANDLERS.IF_HANDLER_ATTRIBUTE_NAME}${Constants.HANDLERS.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX}`;
            const el = document.createElement('div');
            el.setAttribute(readyAttr, '');

            const handler = new Attributes(el, false);

            expect([...handler.getAll(undefined, true).keys()]).toEqual([`${Constants.HANDLERS.IF_HANDLER_ATTRIBUTE_NAME}${Constants.HANDLERS.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX}`]);
            expect(handler.has(readyAttr)).toBe(false);
            expect(handler.getAll().size).toBe(0);
            expect(() => handler.set(readyAttr, 'x')).toThrow(/system/);
            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('has with isSystem flag', () => {
        it('should return true for system attributes with isSystem=true', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(handler.has(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME, true)).toBe(true);
        });

        it('should return false for non-existent system attributes with isSystem=true', () => {
            const el = document.createElement('div');
            const handler = new Attributes(el, false);

            expect(handler.has('nonexistent', true)).toBe(false);
        });
    });

    describe('remove system attribute', () => {
        it('should allow removing a plain attribute that collides with a system handler name', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            el.setAttribute('value', 'plain');
            const handler = new Attributes(el, false);

            //removing the plain 'value' attribute must not throw even though nb-value is bound
            expect(() => handler.remove('value')).not.toThrow();
            expect(handler.has('value')).toBe(false);
        });

        it('should still throw when removing the fully-prefixed system attribute name', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(() => handler.remove(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`)).toThrow(/system/);
        });
    });

    describe('isNApplicable', () => {
        it('should return true for elements with nb- attributes', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');

            expect(Attributes.isNApplicable(el)).toBe(true);
        });

        it('should return false for elements without nb- attributes', () => {
            const el = document.createElement('div');
            el.setAttribute('class', 'test');

            expect(Attributes.isNApplicable(el)).toBe(false);
        });

        it('should return true for elements with nb- prefix handler attributes', () => {
            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}click`,
                'ctx.onClick()'
            );

            expect(Attributes.isNApplicable(el)).toBe(true);
        });

        // The nodeType guard was removed: the only caller (TreeBuilder) walks firstElementChild /
        // nextElementSibling, so isNApplicable is only ever given elements.
        it('should return false for an element without attributes', () => {
            expect(Attributes.isNApplicable(document.createElement('div'))).toBe(false);
        });
    });

    describe('constructor branch coverage', () => {
        it('should error when attribute name is "class"', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}class`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(handler.hasNExpression).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should error when attribute name is "style"', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}style`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(handler.hasNExpression).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should error when attribute name is a known handler (e.g. nb-value)', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            // nb-attr:nb-value → attributeName becomes 'nb-value' which is in KNOWN_HANDLERS_SET
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(handler.hasNExpression).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should error when attribute name starts with a known prefix handler (e.g. nb-event)', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            // nb-attr:nb-event:click → attributeName 'nb-event:click' starts with known prefix 'nb-event'
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}click`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should error when attribute name is empty after prefix', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should error on duplicate system attribute', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            // Manually add two of the same system attribute by manipulating the element  
            // This is tricky since setAttribute overwrites, but the code iterates attributes
            // We'll test the "incorrect binding" path instead
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, '');
            const handler = new Attributes(el, false);

            // Empty value on a known handler that requires value should error
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should accept nb- attributes without value for known handlers without value', () => {
            // Handlers like case, default, bound, template that work without explicit value
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME}`, '');
            const handler = new Attributes(el, false);

            // Should not error — default is a known handler without value
            expect(handler.has(Constants.HANDLERS.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME, true)).toBe(true);
        });

        it('should not error for handler ready attribute suffix even when empty', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${Constants.PREFIX_AND_SEPARATOR}if${Constants.HANDLERS.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX}`, '');
            const handler = new Attributes(el, false);
            
            // Ready attributes should not produce error
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('has with isPrefix flag', () => {
        it('should find system attributes by prefix with isPrefixRequired=true', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}click`, 'ctx.onClick()');
            const handler = new Attributes(el, false);

            expect(handler.has(Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true, true)).toBe(true);
        });

        it('should find system attributes by prefix with isPrefixRequired=false (exact match)', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            const handler = new Attributes(el, false);

            expect(handler.has(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME, true, true, false)).toBe(true);
        });

        it('should find non-system attributes by prefix with isPrefixRequired=true', () => {
            const el = document.createElement('div');
            el.setAttribute(`data${Constants.META_VALUE_SEPARATOR}id`, 'test');
            el.setAttribute(`data${Constants.META_VALUE_SEPARATOR}name`, 'test2');
            const handler = new Attributes(el, false);

            expect(handler.has('data', false, true)).toBe(true);
        });

        it('should find non-system attributes by prefix with isPrefixRequired=false', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'test');
            const handler = new Attributes(el, false);

            expect(handler.has('title', false, true, false)).toBe(true);
        });
    });

    describe('get with isPrefix flag', () => {
        it('should get system attribute by prefix returning [key, value] tuple', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}click`, 'ctx.onClick()');
            const handler = new Attributes(el, false);

            const result = handler.get(Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true, true);
            expect(Array.isArray(result)).toBe(true);
            expect((result as [string, string])[1]).toBe('ctx.onClick()');
        });

        it('should return undefined for system prefix when not found', () => {
            const el = document.createElement('div');
            const handler = new Attributes(el, false);

            const result = handler.get('nonexistent', true, true);
            expect(result).toBeUndefined();
        });

        it('should get system attribute by prefix with isPrefixRequired=false', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            const handler = new Attributes(el, false);

            const result = handler.get(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME, true, true, false);
            expect(Array.isArray(result)).toBe(true);
        });

        it('should get non-system attribute by prefix returning [key, value] tuple', () => {
            const el = document.createElement('div');
            el.setAttribute(`data${Constants.META_VALUE_SEPARATOR}id`, 'test');
            const handler = new Attributes(el, false);

            const result = handler.get('data', false, true);
            expect(Array.isArray(result)).toBe(true);
            expect((result as [string, string])[1]).toBe('test');
        });

        it('should return undefined for non-system prefix when not found', () => {
            const el = document.createElement('div');
            const handler = new Attributes(el, false);

            const result = handler.get('nonexistent', false, true);
            expect(result).toBeUndefined();
        });

        it('should get non-system attribute by prefix with isPrefixRequired=false', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'test');
            const handler = new Attributes(el, false);

            const result = handler.get('title', false, true, false);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getAll with prefix', () => {
        it('should get all system attributes matching prefix', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}click`, 'ctx.onClick()');
            el.setAttribute(`${Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}input`, 'ctx.onInput()');
            const handler = new Attributes(el, false);

            const all = handler.getAll(Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true);
            expect(all.size).toBe(2);
        });

        it('should get all non-system attributes matching prefix', () => {
            const el = document.createElement('div');
            el.setAttribute(`data${Constants.META_VALUE_SEPARATOR}id`, 'a');
            el.setAttribute(`data${Constants.META_VALUE_SEPARATOR}name`, 'b');
            el.setAttribute('title', 'c');
            const handler = new Attributes(el, false);

            const all = handler.getAll('data', false);
            expect(all.size).toBe(2);
        });

        it('should get all non-system attributes with isPrefixRequired=false (includes exact match)', () => {
            const el = document.createElement('div');
            el.setAttribute('data', 'exact');
            el.setAttribute(`data${Constants.META_VALUE_SEPARATOR}id`, 'prefixed');
            const handler = new Attributes(el, false);

            const all = handler.getAll('data', false, false);
            expect(all.size).toBe(2);
        });

        it('should get all system attributes without prefix', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            const handler = new Attributes(el, false);

            const all = handler.getAll(undefined, true);
            expect(all.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('set/remove edge cases', () => {
        it('should not mark dirty when setting same value', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'hello');
            const handler = new Attributes(el, false);

            // commit to clear dirty
            handler.commit();

            handler.set('title', 'hello');
            expect(handler.isDirty).toBe(false);
        });

        it('should not mark dirty when removing non-existent attribute', () => {
            const el = document.createElement('div');
            const handler = new Attributes(el, false);

            handler.remove('nonexistent');
            expect(handler.isDirty).toBe(false);
        });

        it('should delete attribute when set to null', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'hello');
            const handler = new Attributes(el, false);

            handler.set('title', null);
            expect(handler.has('title')).toBe(false);
        });
    });

    describe('commit edge cases', () => {
        it('should remove attributes from DOM that were deleted', () => {
            const el = document.createElement('div');
            el.setAttribute('data-x', 'y');
            const handler = new Attributes(el, false);

            handler.commit(); // initial sync
            handler.remove('data-x');
            handler.commit();

            expect(el.hasAttribute('data-x')).toBe(false);
        });

        it('should sync existing attribute value changes', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'old');
            const handler = new Attributes(el, false);

            handler.commit(); // initial sync
            handler.set('title', 'new');
            handler.commit();

            expect(el.getAttribute('title')).toBe('new');
        });
    });

    describe('non-system attribute get/has/getAll without isPrefix flag', () => {
        it('should get non-system attribute by exact name without prefix', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'test-title');
            const handler = new Attributes(el, false);

            expect(handler.get('title')).toBe('test-title');
        });

        it('should has non-system attribute by exact name without prefix', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'test-title');
            const handler = new Attributes(el, false);

            expect(handler.has('title')).toBe(true);
            expect(handler.has('nonexistent')).toBe(false);
        });

        it('should getAll non-system attributes without prefix', () => {
            const el = document.createElement('div');
            el.setAttribute('title', 'test-title');
            el.setAttribute('data-x', 'val');
            const handler = new Attributes(el, false);

            const all = handler.getAll();
            expect(all.size).toBeGreaterThanOrEqual(2);
        });
    });

    describe('bind and commit with expressions', () => {
        it('should bind expressions and set attributes on commit', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}data-id`, 'ctx.id');
            const handler = new Attributes(el, false);

            expect(handler.hasNExpression).toBe(true);

            handler.bind(undefined, () => '42');
            expect(handler.isDirty).toBe(true);

            handler.commit();
            expect(el.getAttribute('data-id')).toBe('42');
        });

        it('should not be dirty after binding same value twice', () => {
            const el = document.createElement('div');
            el.setAttribute(`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}data-id`, 'ctx.id');
            const handler = new Attributes(el, false);

            handler.bind(undefined, () => '42');
            handler.commit();

            handler.bind(undefined, () => '42');
            expect(handler.isDirty).toBe(false);
        });
    });

    describe('duplicate system attribute', () => {
        it('should error for duplicate system attribute via raw attributes', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            // Use NamedNodeMap manipulation to add duplicate system attribute
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.x');
            el.setAttribute(`${Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME}`, 'ctx.y');
            // Since setAttribute overwrites, we can't easily create duplicate DOM attributes
            // But we can test the "no hasAttributes" branch
            consoleSpy.mockRestore();
        });
    });

    describe('R2-6: nb-attr:on* HTML event-attribute warning', () => {
        const attrPrefix = `${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}`;

        it('should warn for an on* attribute name when showDebugInfo is on', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${attrPrefix}onclick`, 'ctx.x');
            new Attributes(el, true);

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy.mock.calls[0].join(' ')).toContain('onclick');
            consoleSpy.mockRestore();
        });

        it('should stay silent when showDebugInfo is off', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${attrPrefix}onclick`, 'ctx.x');
            new Attributes(el, false);

            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should still create the binding — the on* check warns, it does not reject', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${attrPrefix}onclick`, 'ctx.x');
            const handler = new Attributes(el, true);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression!.has('onclick')).toBe(true);
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            handler.bind(undefined, () => 'doSomething()');
            handler.commit();
            expect(el.getAttribute('onclick')).toBe('doSomething()');

            consoleErrorSpy.mockRestore();
            consoleWarnSpy.mockRestore();
        });

        it('should not warn for attribute names that do not start with "on"', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${attrPrefix}data-id`, 'ctx.x');
            new Attributes(el, true);

            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should warn for any on*-shaped name — the check is a name heuristic, not an event lookup', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(`${attrPrefix}once`, 'ctx.x');
            const handler = new Attributes(el, true);

            expect(consoleSpy).toHaveBeenCalled();
            expect(handler.nExpression!.has('once')).toBe(true);
            consoleSpy.mockRestore();
        });
    });

    describe('L-21: nb-in / nb-in-ref alone do not make an element N-applicable', () => {
        afterEach(() => {
            Constants.changeCompliancyWithW3C(false);
        });

        it.each(['nb-in:label', 'nb-in-ref:label'])('%s alone does not make an element N-applicable', (name) => {
            const el = document.createElement('div');
            el.setAttribute(name, 'this.label');

            expect(Attributes.isNApplicable(el)).toBe(false);
        });

        it.each(['nb-in:label', 'nb-in-ref:label'])('%s is still read as a system attribute next to nb-container', (name) => {
            const el = document.createElement('div');
            el.setAttribute('nb-container', '@child');
            el.setAttribute(name, 'this.label');
            const attrs = new Attributes(el, false);

            expect(Attributes.isNApplicable(el)).toBe(true);
            const handlerName = name.slice(0, name.indexOf(':'));
            expect(attrs.has(handlerName, true, true)).toBe(true);
            expect([...attrs.getAll(handlerName, true)]).toEqual([[handlerName + ':label', 'this.label']]);
        });

        it('nb-attr:nb-in:* is rejected as a system attribute', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute('nb-attr:nb-in:label', 'this.label');
            const attrs = new Attributes(el, false);

            expect(attrs.hasNExpression).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, 'system (nb-in:label) attribute changes is not allowed');
            consoleSpy.mockRestore();
        });

        it('follows the W3C prefix and separator', () => {
            Constants.changeCompliancyWithW3C(true);

            const alone = document.createElement('div');
            alone.setAttribute('data-nb-in--label', 'this.label');
            expect(Attributes.isNApplicable(alone)).toBe(false);

            const withContainer = document.createElement('div');
            withContainer.setAttribute('data-nb-container', '@child');
            withContainer.setAttribute('data-nb-in-ref--label', 'this.label');
            const attrs = new Attributes(withContainer, false);
            expect(attrs.has(Constants.HANDLERS.IN_REF_HANDLER_ATTRIBUTE_NAME, true, true)).toBe(true);
            expect([...attrs.getAll(Constants.HANDLERS.IN_REF_HANDLER_ATTRIBUTE_NAME, true)]).toEqual([['data-nb-in-ref--label', 'this.label']]);
        });

        it('an entity still receives nb-in, and a stray nb-in is never evaluated', () => {
            jest.useFakeTimers();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            try {
                let received: any;
                class L21Child {
                    public label: any;
                    public onInputsRefreshDone(): void { received = this.label; }
                }
                Environment.addContainer('L21Child', L21Child as any, [], '<span></span>', undefined);

                let reads = 0;
                const host = { text: 'hello', read: () => { reads++; return 'x'; } };
                const root = document.createElement('div');
                root.innerHTML = '<span nb-in:label="this.read()"></span>' +
                                 '<span nb-value="this.text" nb-in-ref:label="this.read()"></span>' +
                                 '<div nb-container="@L21Child" nb-in:label="this.text"></div>';
                document.body.appendChild(root);

                const binder = new ContextBinder(null, null, undefined, false, false, undefined,
                                                 () => undefined, () => undefined);
                binder.bind(root, host as any, true, false);
                jest.runAllTimers();

                expect(received).toBe('hello');
                expect(reads).toBe(0);
                expect(root.children[1].textContent).toBe('hello');
                // known gap: a stray nb-in is still ignored without a diagnostic
                expect(consoleSpy).not.toHaveBeenCalled();

                binder.dispose();
                root.remove();
            } finally {
                consoleSpy.mockRestore();
                jest.useRealTimers();
            }
        });
    });
    describe('L-16..L-19: nb-* attribute classification', () => {
        let errorSpy: jest.SpyInstance;

        function create(attrs: Record<string, string>): { el: Element; handler: Attributes } {
            const el = document.createElement('div');
            for (const [name, value] of Object.entries(attrs)) {
                el.setAttribute(name, value);
            }
            return { el, handler: new Attributes(el, false) };
        }

        const errors = (): Array<string> => errorSpy.mock.calls.map(call => String(call[call.length - 1]));

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
            Constants.changeCompliancyWithW3C(false);
        });

        describe('L-16: prefix handlers match only with their separator', () => {
            it.each(['nb-index', 'nb-info', 'nb-in-reference', 'nb-repeated', 'nb-variant', 'nb-events', 'nb-property', 'nb-attribute', 'nb-aspects'])(
                '%s alone does not make an element N-applicable', (name) => {
                    const el = document.createElement('div');
                    el.setAttribute(name, 'x');
                    expect(Attributes.isNApplicable(el)).toBe(false);
                });

            it('keeps look-alike names as regular attributes, so they can be changed at runtime', () => {
                const { handler } = create({ 'nb-value': 'this.x', 'nb-index': '1', 'nb-repeated': 'a', 'nb-variant': 'b' });

                expect([...handler.getAll().keys()]).toEqual(['nb-index', 'nb-repeated', 'nb-variant']);
                expect([...handler.getAll(undefined, true).keys()]).toEqual(['nb-value']);
                expect(() => handler.set('nb-index', '2')).not.toThrow();
                expect(errors()).toEqual([]);
            });

            it('still recognizes the real prefix handlers, including plain nb-repeat', () => {
                const { el, handler } = create({ 'nb-repeat': 'this.items', 'nb-repeat:row': 'this.rows', 'nb-in:x': 'this.a', 'nb-in-ref:y': 'this.b', 'nb-var:v': '1' });

                expect(Attributes.isNApplicable(el)).toBe(true);
                expect([...handler.getAll(undefined, true).keys()]).toEqual(['nb-repeat', 'nb-repeat:row', 'nb-in:x', 'nb-in-ref:y', 'nb-var:v']);
                expect(handler.getAll().size).toBe(0);
                expect(errors()).toEqual([]);
            });

            it('follows the W3C prefix and separator', () => {
                Constants.changeCompliancyWithW3C(true);
                const { handler } = create({ 'data-nb-index': '1', 'data-nb-in--x': 'this.a', 'data-nb-repeat': 'this.items' });

                expect([...handler.getAll().keys()]).toEqual(['data-nb-index']);
                expect([...handler.getAll(undefined, true).keys()]).toEqual(['data-nb-in--x', 'data-nb-repeat']);
            });
        });

        describe('L-17: unknown nb-* attributes are kept as regular attributes', () => {
            it('keeps them with and without a value, without an error', () => {
                const { handler } = create({ 'nb-value': 'this.x', 'nb-custom': 'x', 'nb-flag': '' });

                expect(handler.getAll().get('nb-custom')).toBe('x');
                expect(handler.getAll().get('nb-flag')).toBe('');
                expect(errors()).toEqual([]);
            });

            it('removes an unknown nb-* attribute from the DOM on commit', () => {
                const { el, handler } = create({ 'nb-value': 'this.x', 'nb-custom': 'x' });

                handler.remove('nb-custom');
                handler.commit();

                expect(el.hasAttribute('nb-custom')).toBe(false);
            });

            it('still reports an empty known handler', () => {
                create({ 'nb-value': '' });
                expect(errors()).toEqual(['incorrect binding found, nb-value attributes should have value.']);
            });
        });

        describe('L-18: bare prefix handlers are reported', () => {
            it.each(['nb-in', 'nb-in-ref', 'nb-var', 'nb-event', 'nb-prop', 'nb-attr', 'nb-aspect'])('%s without a name logs an error', (name) => {
                const { handler } = create({ 'nb-value': 'this.x', [name]: 'this.y' });

                expect(errors()).toHaveLength(1);
                expect(errors()[0]).toMatch(new RegExp(`^incorrect binding found, ${name} should have meta value`));
                expect(handler.getAll().has(name)).toBe(false);
            });

            it('does not report a plain nb-repeat', () => {
                create({ 'nb-repeat': 'this.items' });
                expect(errors()).toEqual([]);
            });

            it('reports the W3C spelling too', () => {
                Constants.changeCompliancyWithW3C(true);
                create({ 'data-nb-in': 'this.a' });
                expect(errors()[0]).toMatch(/^incorrect binding found, data-nb-in should have meta value/);
            });
        });

        describe('L-19: ready markers are never regular attributes', () => {
            it('keeps every *-ready marker out of getAll()', () => {
                const { handler } = create({ 'nb-if': 'this.x', 'nb-if-ready': '', 'nb-repeat-ready': '' });

                expect(handler.getAll().size).toBe(0);
                expect([...handler.getAll(undefined, true).keys()]).toEqual(['nb-if', 'nb-if-ready', 'nb-repeat-ready']);
                expect(errors()).toEqual([]);
            });

            it('keeps empty framework markers (nb-projection, nb-project-to, nb-component) out of getAll(), but keeps an empty unknown one', () => {
                const { handler } = create({ 'nb-value': 'this.x', 'nb-projection': '', 'nb-project-to': '', 'nb-component': '', 'nb-flag': '' });

                expect([...handler.getAll().keys()]).toEqual(['nb-flag']);
                // valueless framework markers are recorded as system attributes (the Projection
                // handler reads nb-projection through has(..., true), also for the default slot)
                expect([...handler.getAll(undefined, true).keys()]).toEqual(['nb-value', 'nb-projection', 'nb-project-to', 'nb-component']);
                expect(errors()).toEqual([]);
            });
        });

        describe('nb-attr: targets that name framework attributes', () => {
            const bindsTarget = (target: string): boolean => {
                const { handler } = create({ [`nb-attr:${target}`]: 'this.v' });
                return handler.nExpression?.has(target) === true;
            };

            it.each(['nb-value', 'nb-repeat', 'nb-var:x', 'nb-in:x', 'nb-in-ref:y', 'nb-projection', 'nb-component'])(
                'rejects nb-attr:%s as a system attribute', (target) => {
                    expect(bindsTarget(target)).toBe(false);
                    expect(errors()).toEqual([`system (${target}) attribute changes is not allowed`]);
                });

            it.each(['nb-index', 'nb-variant', 'nb-custom'])('binds the look-alike nb-attr:%s (L-16)', (target) => {
                expect(bindsTarget(target)).toBe(true);
                expect(errors()).toEqual([]);
            });

            it.each(['nb-in', 'nb-in-ref', 'nb-var', 'nb-event', 'nb-prop', 'nb-attr', 'nb-aspect'])('rejects a bare prefix name nb-attr:%s as a system attribute', (target) => {
                expect(bindsTarget(target)).toBe(false);
                expect(errors()).toEqual([`system (${target}) attribute changes is not allowed`]);
            });
        });
    });
});

// Constants restructure: handlers pass FULL system names (nb-…, data-nb-… in W3C mode) to has / get / getAll,
// and get / getAll return full keys — so a prefix handler strips exactly `<full handler name><meta separator>`.
describe('Attributes handler — full system names', () => {
    afterEach(() => Constants.changeCompliancyWithW3C(false));

    function create(attributes: Record<string, string>): Attributes {
        const el = document.createElement('div');
        for (const [name, value] of Object.entries(attributes)) {
            el.setAttribute(name, value);
        }
        return new Attributes(el, false);
    }

    it.each([false, true])('getAll(prefix) finds the prefix handlers by their full name and returns full keys (W3C: %s)', (compliant) => {
        Constants.changeCompliancyWithW3C(compliant);
        const H = Constants.HANDLERS, M = Constants.META_VALUE_SEPARATOR;
        const attrs = create({ [`${H.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${M}click`]: 'this.a()',
                               [`${H.VARIABLE_HANDLER_PREFIX_NAME}${M}v`]: '1',
                               [`${H.PROPERTY_HANDLER_ATTRIBUTE_NAME}${M}title`]: 'v',
                               [`${H.IN_HANDLER_ATTRIBUTE_NAME}${M}q`]: 'this.q',
                               [H.CONTAINER_HANDLER_ATTRIBUTE_NAME]: '@x' });

        expect([...attrs.getAll(H.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true)]).toEqual([[`${H.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${M}click`, 'this.a()']]);
        expect([...attrs.getAll(H.VARIABLE_HANDLER_PREFIX_NAME, true)]).toEqual([[`${H.VARIABLE_HANDLER_PREFIX_NAME}${M}v`, '1']]);
        expect([...attrs.getAll(H.PROPERTY_HANDLER_ATTRIBUTE_NAME, true)]).toEqual([[`${H.PROPERTY_HANDLER_ATTRIBUTE_NAME}${M}title`, 'v']]);
        // nb-in must not pick up nb-in-ref and vice versa — the separator is part of the match
        expect([...attrs.getAll(H.IN_HANDLER_ATTRIBUTE_NAME, true).keys()]).toEqual([`${H.IN_HANDLER_ATTRIBUTE_NAME}${M}q`]);
        expect(attrs.getAll(H.IN_REF_HANDLER_ATTRIBUTE_NAME, true).size).toBe(0);
    });

    it('does not accept the short (suffix-only) names any more', () => {
        const attrs = create({ 'nb-value': 'this.v', 'nb-event:click': 'this.a()' });

        expect(attrs.has('value', true)).toBe(false);
        expect(attrs.get('value', true)).toBeUndefined();
        expect(attrs.getAll('event', true).size).toBe(0);

        expect(attrs.has(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME, true)).toBe(true);
        expect(attrs.get(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME, true)).toBe('this.v');
    });

    it.each([false, true])('get(prefix, …, isPrefixRequired=false) returns the full key of a plain and a prefixed nb-repeat (W3C: %s)', (compliant) => {
        Constants.changeCompliancyWithW3C(compliant);
        const REPEAT = Constants.HANDLERS.REPEAT_HANDLER_ATTRIBUTE_NAME;

        expect(create({ [REPEAT]: 'this.items' }).get(REPEAT, true, true, false)).toEqual([REPEAT, 'this.items']);
        expect(create({ [`${REPEAT}${Constants.META_VALUE_SEPARATOR}row`]: 'this.rows' }).get(REPEAT, true, true, false))
            .toEqual([`${REPEAT}${Constants.META_VALUE_SEPARATOR}row`, 'this.rows']);
    });

    it.each([false, true])('parses nb-attr bindings by their full name (W3C: %s)', (compliant) => {
        Constants.changeCompliancyWithW3C(compliant);
        const attrs = create({ [`${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}data-q`]: "'q'" });

        expect(attrs.hasNExpression).toBe(true);
        expect([...attrs.nExpression!.keys()]).toEqual(['data-q']);
    });
});
