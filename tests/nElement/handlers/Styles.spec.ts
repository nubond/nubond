import { Styles } from '../../../src/nElement/handlers/Styles';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

describe('Styles handler', () => {
    function createElementWithAttr(expression?: string): HTMLElement {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.STYLE_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    it('should detect style expression', () => {
        const el = createElementWithAttr('color: ctx.myColor; font-size: ctx.fontSize');
        const attrs = new Attributes(el);
        const handler = new Styles(el, attrs);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
        expect(handler.nExpression!.size).toBe(2);
        expect(handler.nExpression!.has('color')).toBe(true);
        expect(handler.nExpression!.has('font-size')).toBe(true);
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Styles(el, attrs);

        expect(handler.hasNExpression).toBe(false);
    });

    describe('get/set/has/remove', () => {
        it('should set and get a style', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            expect(handler.has('color')).toBe(true);
            expect(handler.get('color')).toBe('red');
            expect(handler.isDirty).toBe(true);
        });

        it('should remove a style', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'blue');
            handler.remove('color');
            expect(handler.has('color')).toBe(false);
        });

        it('should treat null/undefined as removal', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'blue');
            handler.set('color', null);
            expect(handler.has('color')).toBe(false);
        });

        it('should not mark as dirty when setting same value', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'green');
            handler.commit();
            handler.set('color', 'green');
            // Still dirty from initial set, but commit cleared it
            // Re-setting same value should not re-dirty
            expect(handler.isDirty).toBe(false);
        });

        it('should getAll styles', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            handler.set('font-size', '12px');
            const all = handler.getAll();
            expect(all.get('color')).toBe('red');
            expect(all.get('font-size')).toBe('12px');
        });

        it('should return a frozen Map from getAll()', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            const all = handler.getAll();
            expect(Object.isFrozen(all)).toBe(true);
        });

        it('should return a snapshot from getAll() (subsequent set not reflected)', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            const snapshot = handler.getAll();
            handler.set('font-size', '12px');

            expect(snapshot.has('font-size')).toBe(false);
            expect(handler.getAll().has('font-size')).toBe(true);
        });
    });

    describe('bind', () => {
        it('should bind expression to style properties', () => {
            const el = createElementWithAttr('color: ctx.myColor');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.bind(undefined, () => 'red');
            handler.commit();

            // The style.setProperty is called inside commit
            expect(el.style.getPropertyValue('color')).toBe('red');
        });

        it('should return executionParams', () => {
            const el = createElementWithAttr('color: ctx.c');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            const params = { x: 1 } as any;
            expect(handler.bind(params, () => 'blue')).toBe(params);
        });
    });

    describe('commit', () => {
        it('should return false when not dirty', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            expect(handler.commit()).toBe(false);
        });

        it('should remove a previously-set style on commit after removal', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('red');

            handler.remove('color');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('');
            expect(handler.has('color')).toBe(false);
        });

        it('should re-apply a style when its value changes between commits', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('red');

            // Change value — the previousValue is defined AND new value differs,
            // so the "value !== previousValue" branch fires and the DOM is updated.
            handler.set('color', 'blue');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('blue');
        });
    });

    describe('constructor error paths', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        it('should log error for whitespace-only style property name', () => {
            // Second style prop has only whitespace before the colon; after the per-entry trim
            // this collapses to ":value", which is reported as an incorrect style expression.
            const el = createElementWithAttr('color: ctx.val;  : ctx.val2');
            const attrs = new Attributes(el);
            new Styles(el, attrs);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('has incorrect style expression'));
        });

        it('should log error for expression without colon separator', () => {
            const el = createElementWithAttr('badExpression');
            const attrs = new Attributes(el);
            new Styles(el, attrs);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('has incorrect style expression'));
        });
    });

    describe('set edge cases', () => {
        it('should treat empty string value as removal', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Styles(el, attrs);

            handler.set('color', 'blue');
            expect(handler.has('color')).toBe(true);

            handler.set('color', '');
            expect(handler.has('color')).toBe(false);
        });
    });
});
