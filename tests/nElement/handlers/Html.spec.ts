import { Html } from '../../../src/nElement/handlers/Html';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

describe('Html handler', () => {
    function createElementWithAttr(expression?: string): Element {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.HTML_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    it('should detect expression from element attribute', () => {
        const el = createElementWithAttr('ctx.content');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, undefined);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression if attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, undefined);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should set innerHTML on commit after bind', () => {
        const el = createElementWithAttr('ctx.html');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, undefined);

        handler.bind(undefined, () => '<b>bold</b>');
        handler.commit();

        expect(el.innerHTML).toBe('<b>bold</b>');
    });

    it('should apply htmlSanitizer when provided', () => {
        const sanitizer = (html: string) => html.replace(/<script>/g, '');
        const el = createElementWithAttr('ctx.html');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, sanitizer);

        handler.bind(undefined, () => '<script>alert("xss")</script>');
        handler.commit();

        // The sanitizer removes <script> tag
        expect(el.innerHTML).not.toContain('<script>');
    });

    it('should not update DOM when html has not changed', () => {
        const el = createElementWithAttr('ctx.html');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, undefined);

        handler.bind(undefined, () => '<p>Hello</p>');
        handler.commit();

        handler.bind(undefined, () => '<p>Hello</p>');
        handler.commit();

        expect(el.innerHTML).toBe('<p>Hello</p>');
    });

    it('commit should return false when not dirty', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, undefined);

        expect(handler.commit()).toBe(false);
    });

    it('should use htmlSanitizer function when provided (covers htmlSanitizer branch)', () => {
        const sanitizer = jest.fn((html: string) => html.toUpperCase());
        const el = createElementWithAttr('ctx.html');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, sanitizer);

        handler.bind(undefined, () => '<p>hello</p>');
        handler.commit();

        expect(sanitizer).toHaveBeenCalledWith('<p>hello</p>');
        expect(el.innerHTML).toBe('<p>HELLO</p>');
    });

    it('should return executionParams from bind', () => {
        const el = createElementWithAttr('ctx.x');
        const attrs = new Attributes(el);
        const handler = new Html(el, attrs, undefined);

        const params = { a: 1 } as any;
        expect(handler.bind(params, () => 'test')).toBe(params);
    });

    describe('sanitizer call site', () => {
        it('should not call sanitizer during bind()', () => {
            const sanitizer = jest.fn((html: string) => html);
            const el = createElementWithAttr('ctx.html');
            const attrs = new Attributes(el);
            const handler = new Html(el, attrs, sanitizer);

            handler.bind(undefined, () => '<p>x</p>');

            // Sanitizer must run only at commit time, not during bind.
            expect(sanitizer).not.toHaveBeenCalled();
        });

        it('should call sanitizer once per commit when html changed', () => {
            const sanitizer = jest.fn((html: string) => html);
            const el = createElementWithAttr('ctx.html');
            const attrs = new Attributes(el);
            const handler = new Html(el, attrs, sanitizer);

            handler.bind(undefined, () => '<p>a</p>');
            handler.commit();
            expect(sanitizer).toHaveBeenCalledTimes(1);

            handler.bind(undefined, () => '<p>b</p>');
            handler.commit();
            expect(sanitizer).toHaveBeenCalledTimes(2);
        });

        it('should not call sanitizer on commit when html is unchanged', () => {
            const sanitizer = jest.fn((html: string) => html);
            const el = createElementWithAttr('ctx.html');
            const attrs = new Attributes(el);
            const handler = new Html(el, attrs, sanitizer);

            handler.bind(undefined, () => '<p>same</p>');
            handler.commit();
            expect(sanitizer).toHaveBeenCalledTimes(1);

            // Same value — commit should short-circuit and skip sanitizer.
            handler.bind(undefined, () => '<p>same</p>');
            handler.commit();
            expect(sanitizer).toHaveBeenCalledTimes(1);
        });
    });
});
