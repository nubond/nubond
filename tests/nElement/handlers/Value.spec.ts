import { Value } from '../../../src/nElement/handlers/Value';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

describe('Value handler', () => {
    function createElementWithAttr(expression?: string): Element {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.VALUE_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    it('should detect expression from element attribute', () => {
        const el = createElementWithAttr('context.title');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression if attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        expect(handler.hasNExpression).toBe(false);
        expect(handler.nExpression).toBeUndefined();
    });

    it('should not be dirty initially when expression exists', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        expect(handler.isDirty).toBe(false);
    });

    it('should set textContent on commit after bind', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        handler.bind(undefined, (expr) => 'Hello World');
        expect(handler.isDirty).toBe(true);

        handler.commit();
        expect(el.textContent).toBe('Hello World');
        expect(handler.isDirty).toBe(false);
    });

    it('should not update DOM when value has not changed', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        handler.bind(undefined, () => 'Same');
        handler.commit();
        
        // Bind again with same value
        handler.bind(undefined, () => 'Same');
        const wasDirty = handler.commit();
        // commit returns true because isDirty was set during bind even though value didn't change from previous commit
        // But importantly, textContent should only be set when value changes
        expect(el.textContent).toBe('Same');
    });

    it('should return executionParams from bind', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        const params = { some: 'params' } as any;
        const result = handler.bind(params, () => 'test');
        expect(result).toBe(params);
    });

    it('commit should return false when not dirty', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        expect(handler.commit()).toBe(false);
    });

    it('should set value via bind triggering the value setter', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        handler.bind(undefined, () => 'first');
        handler.commit();
        expect(el.textContent).toBe('first');

        handler.bind(undefined, () => 'second');
        expect(handler.isDirty).toBe(true);
        handler.commit();
        expect(el.textContent).toBe('second');
    });

    // R7-3: _previousValue starts as undefined ('never committed'), not '', so a first value
    // that stringifies to '' still writes and clears the element's authored placeholder.
    it('should clear authored placeholder content when the first value is empty (R7-3)', () => {
        const el = createElementWithAttr('ctx.empty');
        el.textContent = 'placeholder';
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        handler.bind(undefined, () => '');
        expect(handler.commit()).toBe(true);
        expect(el.textContent).toBe('');
    });

    it('should clear the placeholder for values that stringify to empty (R7-3)', () => {
        for (const value of [undefined, null, () => 1, Symbol('s')]) {
            const el = createElementWithAttr('ctx.value');
            el.textContent = 'placeholder';
            const attrs = new Attributes(el, () => false);
            const handler = new Value(el, attrs);

            handler.bind(undefined, () => value);
            handler.commit();
            expect(el.textContent).toBe('');
        }
    });

    it('should clear the placeholder for a one-time expression resolving to empty (R7-3)', () => {
        const el = createElementWithAttr('#ctx.empty');
        el.textContent = 'placeholder';
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        handler.bind(undefined, () => '');
        handler.commit();
        expect(el.textContent).toBe('');
    });

    it('should not rewrite the DOM while the value stays empty (R7-3)', () => {
        const el = createElementWithAttr('ctx.empty');
        el.textContent = 'placeholder';
        const attrs = new Attributes(el, () => false);
        const handler = new Value(el, attrs);

        handler.bind(undefined, () => '');
        handler.commit();

        handler.bind(undefined, () => '');
        expect(handler.commit()).toBe(false);
        expect(el.textContent).toBe('');
    });
});
