import { Exec } from '../../../src/nElement/handlers/Exec';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

describe('Exec handler', () => {
    function createElementWithAttr(expression?: string): Element {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EXEC_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    it('should detect expression from attribute', () => {
        const el = createElementWithAttr('ctx.doSomething()');
        const attrs = new Attributes(el);
        const handler = new Exec(attrs);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Exec(attrs);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should execute expression on bind', () => {
        const el = createElementWithAttr('ctx.init()');
        const attrs = new Attributes(el);
        const handler = new Exec(attrs);

        const executor = jest.fn().mockReturnValue('result');
        handler.bind(undefined, executor);

        expect(executor).toHaveBeenCalled();
    });

    it('should return executionParams from bind', () => {
        const el = createElementWithAttr('ctx.run()');
        const attrs = new Attributes(el);
        const handler = new Exec(attrs);

        const params = { data: true } as any;
        expect(handler.bind(params, () => undefined)).toBe(params);
    });

    it('isDirty should always be false', () => {
        const el = createElementWithAttr('ctx.run()');
        const attrs = new Attributes(el);
        const handler = new Exec(attrs);

        handler.bind(undefined, () => 'x');
        expect(handler.isDirty).toBe(false);
    });

    it('commit should always return false', () => {
        const el = createElementWithAttr('ctx.run()');
        const attrs = new Attributes(el);
        const handler = new Exec(attrs);

        expect(handler.commit()).toBe(false);
    });

    it('should skip expression execution on bind when no expression', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Exec(attrs);

        const executor = jest.fn();
        const params = { data: true } as any;
        expect(handler.bind(params, executor)).toBe(params);
        expect(executor).not.toHaveBeenCalled();
    });
});
