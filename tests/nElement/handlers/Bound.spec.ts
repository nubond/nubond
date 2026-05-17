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
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.BOUND_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    const mockGetElementManipulations = () => ({} as any);

    it('should detect expression from attribute', () => {
        const el = createElementWithAttr('myHandler');
        const attrs = new Attributes(el);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should prefix expression with # if not present', () => {
        const el = createElementWithAttr('myHandler');
        const attrs = new Attributes(el);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        // Bound prepends '#' but ExpressionDetails strips it and sets isSingleBinded
        expect(handler.nExpression!.expression).toBe('myHandler');
        expect(handler.nExpression!.isSingleBinded).toBe(true);
    });

    it('should keep # prefix if already present', () => {
        const el = createElementWithAttr('#myHandler');
        const attrs = new Attributes(el);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.nExpression!.expression).toBe('myHandler');
        expect(handler.nExpression!.isSingleBinded).toBe(true);
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.hasNExpression).toBe(false);
    });

    it('isDirty should always be false', () => {
        const el = createElementWithAttr('handler');
        const attrs = new Attributes(el);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.isDirty).toBe(false);
    });

    it('commit should always return false', () => {
        const el = createElementWithAttr('handler');
        const attrs = new Attributes(el);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        expect(handler.commit()).toBe(false);
    });

    it('should only execute bind once (first bind)', () => {
        const el = createElementWithAttr('handler');
        const attrs = new Attributes(el);
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
        const attrs = new Attributes(el);
        const handler = new Bound(el, attrs, mockGetElementManipulations);

        const params = { x: 1 } as any;
        expect(handler.bind(params, () => {})).toBe(params);
    });
});
