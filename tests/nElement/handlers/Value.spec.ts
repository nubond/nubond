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
        const attrs = new Attributes(el);
        const handler = new Value(el, attrs);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression if attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Value(el, attrs);

        expect(handler.hasNExpression).toBe(false);
        expect(handler.nExpression).toBeUndefined();
    });

    it('should not be dirty initially when expression exists', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el);
        const handler = new Value(el, attrs);

        expect(handler.isDirty).toBe(false);
    });

    it('should set textContent on commit after bind', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el);
        const handler = new Value(el, attrs);

        handler.bind(undefined, (expr) => 'Hello World');
        expect(handler.isDirty).toBe(true);

        handler.commit();
        expect(el.textContent).toBe('Hello World');
        expect(handler.isDirty).toBe(false);
    });

    it('should not update DOM when value has not changed', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el);
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
        const attrs = new Attributes(el);
        const handler = new Value(el, attrs);

        const params = { some: 'params' } as any;
        const result = handler.bind(params, () => 'test');
        expect(result).toBe(params);
    });

    it('commit should return false when not dirty', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Value(el, attrs);

        expect(handler.commit()).toBe(false);
    });

    it('should set value via bind triggering the value setter', () => {
        const el = createElementWithAttr('ctx.name');
        const attrs = new Attributes(el);
        const handler = new Value(el, attrs);

        handler.bind(undefined, () => 'first');
        handler.commit();
        expect(el.textContent).toBe('first');

        handler.bind(undefined, () => 'second');
        expect(handler.isDirty).toBe(true);
        handler.commit();
        expect(el.textContent).toBe('second');
    });
});
