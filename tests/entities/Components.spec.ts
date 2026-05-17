import { Components } from '../../src/entities/Components';
import { Injectables } from '../../src/entities/Injectables';
import { AdoptedStyles } from '../../src/entities/AdoptedStyles';
import { IComponentContext } from '../../src/interfaces/contexts/IComponentContext';
import { Constants } from '../../src/Constants';

// Polyfill CSSStyleSheet for jsdom
if (typeof CSSStyleSheet !== 'undefined' && !CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function (_text: string) {};
}

describe('Components', () => {
    let injectables: Injectables;
    let adoptedStyles: AdoptedStyles;
    let components: Components;
    const mockBinderCreator = () => ({} as any);

    beforeEach(() => {
        injectables = new Injectables();
        adoptedStyles = new AdoptedStyles(() => false);
        components = new Components(injectables, adoptedStyles, () => false);
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should add a component with valid custom element name', () => {
        class MyCtx implements IComponentContext {}

        components.add('my-component', MyCtx as any, [], undefined,
            '<div>template</div>', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(components.has('my-component')).toBe(true);
    });

    it('should reject invalid custom element name (no hyphen)', () => {
        class MyCtx implements IComponentContext {}

        components.add('mycomponent', MyCtx as any, [], undefined,
            '<div>template</div>', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(console.error).toHaveBeenCalled();
        expect(components.has('mycomponent')).toBe(false);
    });

    it('should log error for duplicate component name', () => {
        class MyCtx1 implements IComponentContext {}
        class MyCtx2 implements IComponentContext {}

        components.add('dup-comp', MyCtx1 as any, [], undefined,
            '<div>1</div>', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        components.add('dup-comp', MyCtx2 as any, [], undefined,
            '<div>2</div>', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(console.error).toHaveBeenCalled();
    });

    it('should register the custom element via customElements.define', () => {
        class MyCtx implements IComponentContext {}
        const spy = jest.spyOn(customElements, 'define');

        components.add('ce-test', MyCtx as any, [], undefined,
            '<div>template</div>', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);

        expect(spy).toHaveBeenCalledWith('ce-test', expect.any(Function));
        spy.mockRestore();
    });

    it('should instantiate a context', () => {
        class MyCtx implements IComponentContext {
            value = 'hello';
        }

        components.add('ctx-comp', MyCtx as any, [], undefined,
            '<div>template</div>', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);

        const ctx = components.instantiateContext('ctx-comp') as MyCtx;
        expect(ctx).toBeInstanceOf(MyCtx);
        expect(ctx.value).toBe('hello');
    });

    it('should return undefined for unknown component instantiateContext', () => {
        expect(components.instantiateContext('nonexistent')).toBeUndefined();
    });

    it('should return undefined for unknown component instantiateBinder', () => {
        expect(components.instantiateBinder('nonexistent')).toBeUndefined();
    });

    it('should handle component with styles', () => {
        class MyCtx implements IComponentContext {}

        components.add('styled-comp', MyCtx as any, [], undefined,
            '<div>template</div>', ':host { color: red; }', undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(components.has('styled-comp')).toBe(true);
    });

    it('should convert name to lowercase', () => {
        class MyCtx implements IComponentContext {}

        components.add('My-CaseTest', MyCtx as any, [], undefined,
            '<div>template</div>', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(components.has('my-casetest')).toBe(true);
    });

    it('should instantiate a binder from binderCreator', () => {
        class MyCtx implements IComponentContext {}
        const mockBinder = { bind: jest.fn() } as any;
        const binderCreator = () => mockBinder;

        components.add('binder-comp', MyCtx as any, [], undefined,
            '<div>template</div>', undefined, undefined,
            binderCreator, () => undefined, () => undefined, () => undefined);

        const binder = components.instantiateBinder('binder-comp');
        expect(binder).toBe(mockBinder);
    });

    it('should handle component with .css style path (not ready for style)', () => {
        class MyCtx implements IComponentContext {}

        components.add('css-path-comp', MyCtx as any, [], undefined,
            '<div>template</div>', 'http://localhost/component.css', undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(components.has('css-path-comp')).toBe(true);
        expect(components.isReady('css-path-comp')).toBe(false);
    });

    it('should handle component with style template provider', () => {
        class MyCtx implements IComponentContext {}
        const provider = { get: () => ':host { color: red; }' };

        components.add('style-prov-comp', MyCtx as any, [], undefined,
            '<div>template</div>', provider as any, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(components.has('style-prov-comp')).toBe(true);
        expect(components.isReady('style-prov-comp')).toBe(false);
    });

    it('should handle component with html template path (not ready for html)', () => {
        class MyCtx implements IComponentContext {}

        components.add('html-path-comp', MyCtx as any, [], undefined,
            'http://localhost/template.html', undefined, undefined,
            mockBinderCreator, () => undefined, () => undefined, () => undefined);
        expect(components.has('html-path-comp')).toBe(true);
        expect(components.isReady('html-path-comp')).toBe(false);
    });

    describe('tryPrepare', () => {
        const flushPromises = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
            (globalThis as any).fetch = undefined;
        });

        it('should call readyCallBack(false) immediately when already ready (inline html + no style)', () => {
            class MyCtx implements IComponentContext {}
            components.add('ready-comp', MyCtx as any, [], undefined,
                '<div>ready</div>', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            const result = components.tryPrepare('ready-comp', cb);
            expect(result).toBe(true);
            expect(cb).toHaveBeenCalledWith(false);
        });

        it('should fetch HTML template from URL and become ready', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched html</div>')
            });

            class MyCtx implements IComponentContext {}
            components.add('fetch-html-comp', MyCtx as any, [], undefined,
                'http://localhost/component.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);
            expect(components.isReady('fetch-html-comp')).toBe(false);

            const cb = jest.fn();
            components.tryPrepare('fetch-html-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('fetch-html-comp')).toBe(true);
        });

        it('should fetch CSS from URL and become ready when html is inline', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(':host { color: blue; }')
            });

            class MyCtx implements IComponentContext {}
            components.add('fetch-css-comp', MyCtx as any, [], undefined,
                '<div>html ready</div>', 'http://localhost/styles.css', undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);
            expect(components.isReady('fetch-css-comp')).toBe(false);

            const cb = jest.fn();
            components.tryPrepare('fetch-css-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('fetch-css-comp')).toBe(true);
        });

        it('should fetch BOTH html and css from URLs', async () => {
            let fetchCallCount = 0;
            (globalThis as any).fetch = jest.fn().mockImplementation((url: string) => {
                fetchCallCount++;
                if (url.endsWith('.html')) {
                    return Promise.resolve({
                        ok: true,
                        text: () => Promise.resolve('<div>fetched</div>')
                    });
                } else {
                    return Promise.resolve({
                        ok: true,
                        text: () => Promise.resolve(':host { color: red; }')
                    });
                }
            });

            class MyCtx implements IComponentContext {}
            components.add('both-fetch-comp', MyCtx as any, [], undefined,
                'http://localhost/template.html', 'http://localhost/styles.css', undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('both-fetch-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(fetchCallCount).toBe(2);
            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('both-fetch-comp')).toBe(true);
        });

        it('should handle HTML fetch error (non-debug: cb not fired)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('html-err-comp', MyCtx as any, [], undefined,
                'http://localhost/missing.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('html-err-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(components.isReady('html-err-comp')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should handle CSS fetch error (non-debug: cb not fired)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('css-err-comp', MyCtx as any, [], undefined,
                '<div>html ready</div>', 'http://localhost/styles.css', undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('css-err-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(components.isReady('css-err-comp')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should handle HTML fetch returning empty body (non-debug: cb not fired)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('html-empty-comp', MyCtx as any, [], undefined,
                'http://localhost/empty.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('html-empty-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
            expect(components.isReady('html-empty-comp')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should handle no HTML template source (non-debug: cb not fired)', () => {
            class MyCtx implements IComponentContext {}
            const invalidProvider = { noGet: true };
            components.add('no-html-comp', MyCtx as any, [], undefined,
                invalidProvider as any, undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('no-html-comp', cb);
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('nor html template'));
            expect(components.isReady('no-html-comp')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should handle no style template source (non-debug: cb not fired)', () => {
            class MyCtx implements IComponentContext {}
            const invalidStyleProvider = { noGet: true };
            components.add('no-style-comp', MyCtx as any, [], undefined,
                '<div>html ready</div>', invalidStyleProvider as any, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('no-style-comp', cb);
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('nor style template'));
            expect(components.isReady('no-style-comp')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should use ITemplateProvider for HTML returning string synchronously', () => {
            class MyCtx implements IComponentContext {}
            const provider = { get: () => '<div>from html provider</div>' };
            components.add('html-prov-comp', MyCtx as any, [], undefined,
                provider as any, undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('html-prov-comp', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('html-prov-comp')).toBe(true);
        });

        it('should use ITemplateProvider for style returning string synchronously', () => {
            class MyCtx implements IComponentContext {}
            const provider = { get: () => ':host { display: block; }' };
            components.add('style-prov-sync-comp', MyCtx as any, [], undefined,
                '<div>html</div>', provider as any, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('style-prov-sync-comp', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('style-prov-sync-comp')).toBe(true);
        });

        it('should leave fetchInProgress stuck after error in non-debug mode', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('stuck-comp', MyCtx as any, [], undefined,
                'http://localhost/fail.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb1 = jest.fn();
            components.tryPrepare('stuck-comp', cb1);
            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(components.isReady('stuck-comp')).toBe(false);
            expect(cb1).not.toHaveBeenCalled();

            // Second attempt just queues
            const cb2 = jest.fn();
            components.tryPrepare('stuck-comp', cb2);
            await flushPromises();
            jest.runAllTimers();
            expect(cb2).not.toHaveBeenCalled();
        });

        it('should queue multiple callbacks when fetch is in progress', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched</div>')
            });

            class MyCtx implements IComponentContext {}
            components.add('queued-comp', MyCtx as any, [], undefined,
                'http://localhost/queued.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            components.tryPrepare('queued-comp', cb1);
            components.tryPrepare('queued-comp', cb2);

            await flushPromises();
            jest.runAllTimers();

            expect(cb1).toHaveBeenCalledWith(true);
            expect(cb2).toHaveBeenCalledWith(true);
        });

        it('should isolate exceptions thrown by one readyCallBack from sibling callbacks (M-23)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>shared</div>')
            });

            class MyCtx implements IComponentContext {}
            components.add('iso-comp', MyCtx as any, [], undefined,
                'http://localhost/iso.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb1 = jest.fn(() => { throw new Error('cb1 failed'); });
            const cb2 = jest.fn();
            components.tryPrepare('iso-comp', cb1);
            components.tryPrepare('iso-comp', cb2);

            await flushPromises();
            jest.runAllTimers();

            expect(cb1).toHaveBeenCalled();
            expect(cb2).toHaveBeenCalledWith(true);
        });

        it('should set error message as HTML template in debug mode', async () => {
            components = new Components(injectables, adoptedStyles, () => true);
            jest.spyOn(console, 'error').mockImplementation();

            class MyCtx implements IComponentContext {}
            const invalidProvider = { noGet: true };
            components.add('debug-comp', MyCtx as any, [], undefined,
                invalidProvider as any, undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('debug-comp', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('debug-comp')).toBe(true);
        });

        it('should set error message as style template in debug mode for CSS error', async () => {
            components = new Components(injectables, adoptedStyles, () => true);
            jest.spyOn(console, 'error').mockImplementation();

            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('debug-style-comp', MyCtx as any, [], undefined,
                '<div>html ready</div>', 'http://localhost/styles.css', undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('debug-style-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('debug-style-comp')).toBe(true);
        });

        it('should handle component with inline html + inline style (ready immediately)', () => {
            class MyCtx implements IComponentContext {}
            components.add('inline-both-comp', MyCtx as any, [], undefined,
                '<div>html</div>', ':host { color: red; }', undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            expect(components.isReady('inline-both-comp')).toBe(true);

            const cb = jest.fn();
            const result = components.tryPrepare('inline-both-comp', cb);
            expect(result).toBe(true);
            expect(cb).toHaveBeenCalledWith(false);
        });
    });

    describe('styleSanitizer in setStyleTemplate', () => {
        it('should apply styleSanitizer when provided', () => {
            class MyCtx implements IComponentContext {}
            const sanitizer = (style: string) => style.replace('red', 'blue');
            components.add('sanitize-style-comp', MyCtx as any, [], undefined,
                '<div>html</div>', ':host { color: red; }', undefined,
                mockBinderCreator, () => undefined, () => sanitizer, () => undefined);
            expect(components.has('sanitize-style-comp')).toBe(true);
        });
    });

    describe('customElements integration ($bind path)', () => {
        // jsdom does not fully support custom element instantiation with shadow DOM, so full
        // $bind integration is exercised separately in NElement-level tests. Here we verify
        // the surface registration behavior that we *can* test reliably.

        it('should error and not register when name lacks a hyphen', () => {
            class MyCtx implements IComponentContext {}
            components.add('badname', MyCtx as any, [], undefined,
                '<div></div>', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            expect(console.error).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringContaining('is not valid custom element name')
            );
            expect(components.has('badname')).toBe(false);
        });

        it('should log error when customElements.define throws (H-11 fix)', () => {
            // H-11: customElements.define is unconditionally called and is irreversible. Re-registration
            // throws and must be caught + surfaced as a friendly error rather than crashing the framework.
            class MyCtx implements IComponentContext {}
            const name = `dup-define-comp-${Date.now()}`;

            // First registration registers the element with customElements.
            components.add(name, MyCtx as any, [], undefined,
                '<div></div>', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            // Fresh Components instance bypasses the per-instance dedupe guard so we reach the
            // customElements.define call again, which then throws inside the try/catch.
            const components2 = new Components(injectables, adoptedStyles, () => false);
            components2.add(name, MyCtx as any, [], undefined,
                '<div></div>', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            expect(console.error).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringContaining(`Component '${name}' registration error`)
            );
        });
    });
});
