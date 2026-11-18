import { Bound } from '../../../src/nElement/handlers/Bound';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

// Mock ElementManipulations
jest.mock('../../../src/models/injections/ElementManipulations', () => ({
    ElementManipulations: jest.fn().mockImplementation(() => ({})),
    ElementPropertiesManipulations: jest.fn(),
    ElementAttributesManipulations: jest.fn(),
    ElementStylesManipulations: jest.fn(),
    ElementClassesManipulations: jest.fn(),
}));

describe('Bound handler', () => {
    function createElementWithAttr(expression?: string): Element {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.HANDLERS.BOUND_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    const mockGetElementManipulations = () => ({} as any);

    it('should detect expression from attribute', () => {
        const el = createElementWithAttr('myHandler');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should prefix expression with # if not present', () => {
        const el = createElementWithAttr('myHandler');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        // Bound prepends '#' but ExpressionDetails strips it and sets isSingleBinded
        expect(handler.nExpression!.expression).toBe('myHandler');
        expect(handler.nExpression!.isSingleBinded).toBe(true);
    });

    it('should keep # prefix if already present', () => {
        const el = createElementWithAttr('#myHandler');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.nExpression!.expression).toBe('myHandler');
        expect(handler.nExpression!.isSingleBinded).toBe(true);
    });

    // R8-4: the handler used to prepend '#' unconditionally, producing '#@expr' — which
    // ExpressionDetails hands on as the raw '@expr', and no compile path can parse it. A leading
    // '@' is now passed through untouched so ExpressionDetails converts the constant itself.
    it('should pass a leading @ through so the constant is converted, not prefixed', () => {
        const el = createElementWithAttr('@ping');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.nExpression!.expression).toBe('"ping"');
        expect(handler.nExpression!.isSingleBinded).toBe(true);
    });

    it('should keep numeric and boolean @ constants unquoted', () => {
        const numberEl = createElementWithAttr('@42');
        expect(new Bound(numberEl, new Attributes(numberEl, false), mockGetElementManipulations)
                    .nExpression!.expression).toBe('42');

        const booleanEl = createElementWithAttr('@true');
        expect(new Bound(booleanEl, new Attributes(booleanEl, false), mockGetElementManipulations)
                    .nExpression!.expression).toBe('true');
    });

    it('should turn a lone @ into an empty string constant', () => {
        const el = createElementWithAttr('@');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.nExpression!.expression).toBe('""');
        expect(handler.nExpression!.isSingleBinded).toBe(true);
    });

    it('should hand the executor a literal — an @ expression is never evaluated', () => {
        const el = createElementWithAttr('@this.onBound(element)');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        const executor = jest.fn();
        handler.bind(undefined, executor);
        expect(executor).toHaveBeenCalledWith('"this.onBound(element)"', expect.anything());
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.hasNExpression).toBe(false);
    });

    it('isDirty should always be false', () => {
        const el = createElementWithAttr('handler');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.isDirty).toBe(false);
    });

    it('commit should always return false', () => {
        const el = createElementWithAttr('handler');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.commit()).toBe(false);
    });

    it('should only execute bind once (first bind)', () => {
        const el = createElementWithAttr('handler');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        const executor = jest.fn();
        handler.bind(undefined, executor);
        expect(executor).toHaveBeenCalledTimes(1);

        // Second bind should not execute
        handler.bind(undefined, executor);
        expect(executor).toHaveBeenCalledTimes(1);
    });

    it('should return executionParams from bind', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, false);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        const params = { x: 1 } as any;
        expect(handler.bind(params, () => {})).toBe(params);
    });

    it('should release nExpression (assigned, not deleted) after the one-time bind and never evaluate again', () => {
        const el = createElementWithAttr('this.onBound(element)');
        const handler = new Bound(el, new Attributes(el, false), mockGetElementManipulations);
        const exec = jest.fn().mockReturnValue(undefined);

        handler.bind(undefined, exec);

        expect(exec).toHaveBeenCalledTimes(1);
        expect(handler.nExpression).toBeUndefined();
        expect(Object.prototype.hasOwnProperty.call(handler, 'nExpression')).toBe(true);
        expect(handler.hasNExpression).toBe(true);

        // an undefined result is not retried (nb-bound runs exactly once) and nothing is left to evaluate
        expect(() => handler.bind(undefined, exec)).not.toThrow();
        expect(exec).toHaveBeenCalledTimes(1);
    });

    // The manipulation proxy is reachable from nb-bound only through the injected `element` param.
    describe('element manipulations detection', () => {
        const elementParam = (params: any) => params.values[params.names.indexOf(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_NAME)];

        it('should report false without nb-bound', () => {
            const el = createElementWithAttr();
            expect(new Bound(el, new Attributes(el, false), mockGetElementManipulations).hasElementManipulations).toBe(false);
        });

        it.each([
            ['this.onBound(element)', true],
            ['element.classes.add("ready")', true],
            ['this.ref = element', true],
            ['#this.onBound(element)', true],
            ['this.onBound(nativeElement)', false],
            ['this.onBound(this.element)', false],
            ['this.onBound(elementRef)', false],
            ['this.ready = true', false],
        ])('%s → %s', (expression, expected) => {
            const el = createElementWithAttr(expression);
            const handler = new Bound(el, new Attributes(el, false), mockGetElementManipulations);

            expect(handler.hasElementManipulations).toBe(expected);
        });

        it('should not look into an @ constant — it is never evaluated', () => {
            const el = createElementWithAttr('@element');
            const handler = new Bound(el, new Attributes(el, false), mockGetElementManipulations);

            // the constant becomes the string literal "element"; matching it is a harmless false positive
            expect(handler.nExpression!.expression).toBe('"element"');
            expect(handler.hasElementManipulations).toBe(true);
        });

        it('should never create the proxy and pass element as undefined when the expression does not reference it', () => {
            const el = createElementWithAttr('this.onBound(nativeElement)');
            const getManipulations = jest.fn(() => ({} as any));
            const handler = new Bound(el, new Attributes(el, false), getManipulations);

            const executor = jest.fn();
            handler.bind(undefined, executor);

            const params = executor.mock.calls[0][1];
            expect(params.names).toContain(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_NAME);
            expect(elementParam(params)).toBeUndefined();
            expect(getManipulations).not.toHaveBeenCalled();
        });

        it('should create the proxy on the first bind and pass it as element when the expression references it', () => {
            const el = createElementWithAttr('this.onBound(element)');
            const manipulations = { kind: 'manipulations' };
            const getManipulations = jest.fn(() => manipulations as any);
            const handler = new Bound(el, new Attributes(el, false), getManipulations);

            expect(getManipulations).not.toHaveBeenCalled();

            const executor = jest.fn();
            handler.bind(undefined, executor);

            expect(getManipulations).toHaveBeenCalledTimes(1);
            expect(elementParam(executor.mock.calls[0][1])).toBe(manipulations);
        });
    });
});
