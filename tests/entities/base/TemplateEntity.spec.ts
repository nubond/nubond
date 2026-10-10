import { TemplateEntityMetaData } from '../../../src/entities/base/TemplateEntity';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (_text: string) {};
}

describe('BaseTemplateEntityMetaData.isUrlLikeAndNotContent', () => {
    // This classifier is the only gate between "fetch this path" and "assign this string to
    // innerHTML": TemplateEntityMetaData's constructor and Components/Aspects/AdoptedStyles all
    // branch on it, and the loader then does a plain fetch(value).
    const classify = (value: string) =>
        new TemplateEntityMetaData('<i></i>', () => undefined).isUrlLikeAndNotContent(value);

    describe('recognized as a path to fetch', () => {
        it.each([
            ['/tpl.html'],
            ['/styles/theme.css'],
            ['  /tpl.html  '],                       // trimmed before the check
        ])('root-relative path %s', (value) => {
            expect(classify(value)).toBe(true);
        });
    });

    // By design: a template/style source is a root-relative path of this application. External
    // sources are not supported out of the box — an absolute URL is treated as inline content.
    // Applications that need one pass an ITemplateProvider instead, whose get() may return a
    // Promise and can therefore fetch from anywhere.
    describe('absolute URLs are not supported out of the box (by design)', () => {
        it.each([
            ['http://cdn.example.com/tpl.html'],
            ['https://cdn.example.com/tpl.html'],
            ['HTTPS://CDN.EXAMPLE.COM/tpl.html'],
        ])('%s is treated as content, not fetched', (value) => {
            expect(classify(value)).toBe(false);
        });
    });

    describe('recognized as inline content', () => {
        it.each([
            ['<div>inline</div>'],
            ['/not/a/path/<b>x</b>'],                // '<' wins over the leading '/'
            ['<span>{{ this.x }}</span>'],
            ['/tpl-{{ this.name }}.html'],           // '{' wins over the leading '/'
            ['/multi\nline\ncontent'],               // a newline means content, never a path
            [''],
            ['   '],
        ])('%s', (value) => {
            expect(classify(value)).toBe(false);
        });
    });

    // Only the root-relative spelling is recognized. Every relative spelling is classified as
    // inline content, assigned to innerHTML and rendered as literal text, with no diagnostic.
    describe('known gap: relative paths are treated as content (R6-9)', () => {
        it.each([
            ['./tpl.html'],
            ['../tpl.html'],
            ['templates/tpl.html'],
            ['tpl.html'],
        ])('%s', (value) => {
            expect(classify(value)).toBe(false);
        });
    });

    // The guard is "contains no newline", so a single-line string that merely starts with '/'
    // is classified as a path — including prose that was meant as inline content.
    describe('known gap: single-line content starting with "/" is fetched (R6-9)', () => {
        it.each([
            ['/ inline text with spaces'],
            ['/path with space.html'],
        ])('%s', (value) => {
            expect(classify(value)).toBe(true);
        });
    });

    // A protocol-relative URL passes the startsWith('/') test, so it IS fetched — and it
    // resolves against the page protocol to an external origin. This is the one spelling that
    // still reaches a third-party server despite absolute URLs being rejected above.
    describe('known gap: protocol-relative URLs still reach an external origin (R6-9)', () => {
        it('//cdn.example.com/tpl.html is classified as a path', () => {
            expect(classify('//cdn.example.com/tpl.html')).toBe(true);
        });
    });

    describe('constructor routing', () => {
        it('stores a root-relative path as a path, not as template content', () => {
            const meta = new TemplateEntityMetaData('/tpl.html', () => undefined);
            expect(meta.htmlTemplatePath).toBe('/tpl.html');
            expect(meta.htmlTemplate).toBeUndefined();
            expect(meta.isReady).toBe(false);
        });

        it('stores inline HTML as template content, not as a path', () => {
            const meta = new TemplateEntityMetaData('<div>hi</div>', () => undefined);
            expect(meta.htmlTemplatePath).toBeUndefined();
            expect(meta.htmlTemplate!.innerHTML).toBe('<div>hi</div>');
            expect(meta.isReady).toBe(true);
        });

        it('stores an absolute URL as template content — it renders as text (by design)', () => {
            const meta = new TemplateEntityMetaData('https://cdn.example.com/tpl.html', () => undefined);
            expect(meta.htmlTemplatePath).toBeUndefined();
            expect(meta.htmlTemplate!.innerHTML).toBe('https://cdn.example.com/tpl.html');
        });

        it('known gap: a relative path is stored as content and renders as text (R6-9)', () => {
            const meta = new TemplateEntityMetaData('./tpl.html', () => undefined);
            expect(meta.htmlTemplatePath).toBeUndefined();
            expect(meta.htmlTemplate!.innerHTML).toBe('./tpl.html');
        });

        it('keeps an ITemplateProvider as the provider — the supported route for external sources', () => {
            const provider = { get: () => '<div>from anywhere</div>' };
            const meta = new TemplateEntityMetaData(provider, () => undefined);
            expect(meta.htmlTemplateProvider).toBe(provider);
            expect(meta.htmlTemplatePath).toBeUndefined();
            expect(meta.htmlTemplate).toBeUndefined();
        });
    });
});
