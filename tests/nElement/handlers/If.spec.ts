import { If } from '../../../src/nElement/handlers/If';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Classes } from '../../../src/nElement/handlers/Classes';
import { Constants } from '../../../src/Constants';

describe('If handler', () => {
    const hideClassName = 'nb-hidden';

    function createElements(expression?: string): { el: Element; attrs: Attributes; classes: Classes } {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.IF_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        const attrs = new Attributes(el);
        const classes = new Classes(el, attrs, () => hideClassName);
        return { el, attrs, classes };
    }

    it('should detect expression from attribute', () => {
        const { attrs, classes } = createElements('ctx.visible');
        const handler = new If(attrs, classes);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression when attribute missing', () => {
        const { attrs, classes } = createElements();
        const handler = new If(attrs, classes);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should be visible by default', () => {
        const { attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        expect(handler.isVisible).toBe(true);
    });

    it('should set isVisible to false when expression evaluates falsy', () => {
        const { attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        handler.bind(undefined, () => false);
        expect(handler.isVisible).toBe(false);
    });

    it('should set isVisible to true when expression evaluates truthy', () => {
        const { attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        handler.bind(undefined, () => true);
        expect(handler.isVisible).toBe(true);
    });

    it('should hide element via classes on commit when not visible', () => {
        const { el, attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        handler.bind(undefined, () => false);
        handler.commit();
        classes.commit();

        expect(el.className).toContain(hideClassName);
    });

    it('should show element via classes on commit when visible', () => {
        const { el, attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        // First hide
        handler.bind(undefined, () => false);
        handler.commit();
        classes.commit();
        expect(el.className).toContain(hideClassName);

        // Then show
        handler.bind(undefined, () => true);
        handler.commit();
        classes.commit();
        expect(el.className).not.toContain(hideClassName);
    });

    it('should return executionParams from bind', () => {
        const { attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        const params = { a: 1 } as any;
        expect(handler.bind(params, () => true)).toBe(params);
    });

    it('commit should return false when not dirty', () => {
        const { attrs, classes } = createElements();
        const handler = new If(attrs, classes);

        expect(handler.commit()).toBe(false);
    });

    it('isDirty should be false initially with expression', () => {
        const { attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        expect(handler.isDirty).toBe(false);
    });

    it('isDirty should be true after bind changes visibility', () => {
        const { attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        handler.bind(undefined, () => false);
        expect(handler.isDirty).toBe(true);
    });

    it('should call markAsReady on first commit', () => {
        const { el, attrs, classes } = createElements('ctx.show');
        const handler = new If(attrs, classes);

        handler.bind(undefined, () => true);
        const result = handler.commit();
        expect(result).toBe(true);
    });

    it('should pass through executionParams unchanged when no expression', () => {
        const { attrs, classes } = createElements();
        const handler = new If(attrs, classes);

        const params = { foo: 'bar' } as any;
        const result = handler.bind(params, () => true);

        expect(result).toBe(params);
        expect(handler.isDirty).toBe(false);
    });
});
