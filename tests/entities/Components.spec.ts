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
            '<div>template</div>', '/component.css', undefined,
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
            '/template.html', undefined, undefined,
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
                '/component.html', undefined, undefined,
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
                '<div>html ready</div>', '/styles.css', undefined,
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
                '/template.html', '/styles.css', undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('both-fetch-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(fetchCallCount).toBe(2);
            expect(cb).toHaveBeenCalledWith(true);
            expect(components.isReady('both-fetch-comp')).toBe(true);
        });

        it('should handle HTML fetch error (cb fired even though not ready)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('html-err-comp', MyCtx as any, [], undefined,
                '/missing.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('html-err-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(components.isReady('html-err-comp')).toBe(false);
            expect(cb).toHaveBeenCalledWith(true);
        });

        it('should handle CSS fetch error (cb fired even though not ready)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('css-err-comp', MyCtx as any, [], undefined,
                '<div>html ready</div>', '/styles.css', undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('css-err-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(components.isReady('css-err-comp')).toBe(false);
            expect(cb).toHaveBeenCalledWith(true);
        });

        it('should handle HTML fetch returning empty body (cb fired even though not ready)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('html-empty-comp', MyCtx as any, [], undefined,
                '/empty.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb = jest.fn();
            components.tryPrepare('html-empty-comp', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
            expect(components.isReady('html-empty-comp')).toBe(false);
            expect(cb).toHaveBeenCalledWith(true);
        });

        it('should handle no HTML template source (cb fired even though not ready)', () => {
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
            expect(cb).toHaveBeenCalledWith(true);
        });

        it('should handle no style template source (cb fired even though not ready)', () => {
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
            expect(cb).toHaveBeenCalledWith(true);
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

        it('should release fetchInProgress after error in non-debug mode (callbacks always fire)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IComponentContext {}
            components.add('stuck-comp', MyCtx as any, [], undefined,
                '/fail.html', undefined, undefined,
                mockBinderCreator, () => undefined, () => undefined, () => undefined);

            const cb1 = jest.fn();
            components.tryPrepare('stuck-comp', cb1);
            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(components.isReady('stuck-comp')).toBe(false);
            expect(cb1).toHaveBeenCalledWith(true);

            // Second attempt is able to retry (fetchInProgress was released) and its callback fires too
            const cb2 = jest.fn();
            components.tryPrepare('stuck-comp', cb2);
            await flushPromises();
            jest.runAllTimers();
            expect(cb2).toHaveBeenCalledWith(true);
        });

        it('should queue multiple callbacks when fetch is in progress', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched</div>')
            });

            class MyCtx implements IComponentContext {}
            components.add('queued-comp', MyCtx as any, [], undefined,
                '/queued.html', undefined, undefined,
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
                '/iso.html', undefined, undefined,
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
                '<div>html ready</div>', '/styles.css', undefined,
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
        it('should not apply htmlSanitizer/styleSanitizer to inline template and style', () => {
            class MyCtx implements IComponentContext {}
            const htmlSanitizer = jest.fn((html: string) => html.replace('html', 'sanitized'));
            const styleSanitizer = jest.fn((style: string) => style.replace('red', 'blue'));
            components.add('sanitize-style-comp', MyCtx as any, [], undefined,
                '<div>html</div>', ':host { color: red; }', undefined,
                mockBinderCreator, () => htmlSanitizer, () => styleSanitizer, () => undefined);
            expect(components.has('sanitize-style-comp')).toBe(true);
            expect(htmlSanitizer).not.toHaveBeenCalled();
            expect(styleSanitizer).not.toHaveBeenCalled();
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

    describe('R3-5: adopted stylesheets are adopted in declared order', () => {
        let seq = 0;

        //a real binder is not needed; $bind only forwards it
        const stubBinder = () => ({
            bind: () => {},
            detectChanges: () => {},
            dispose: () => {},
            onDispose: () => {},
        } as any);

        /** register + instantiate + drive $bind; the shadow root is opened so the test can read it back */
        function bindComponent(adoptedStyleNames: Array<string>): ShadowRoot {
            const name = `r35-comp-${++seq}-${Date.now()}`;
            class MyCtx implements IComponentContext {}

            injectables.register(MyCtx as any, []);
            components.add(name, MyCtx as any, [], undefined,
                '<div>tpl</div>', undefined, adoptedStyleNames,
                stubBinder, () => undefined, () => undefined, () => ({ mode: 'open' }));

            const el = document.createElement(name);
            document.body.appendChild(el);
            (el as any).$bind(stubBinder(), {} as any, false);

            if (!el.shadowRoot) { throw new Error('no shadow root — harness problem'); }
            return el.shadowRoot;
        }

        it('should adopt two ready stylesheets in declared order, not registration order', () => {
            adoptedStyles.add('r35-a', '.a { color: red; }', () => undefined);
            adoptedStyles.add('r35-b', '.b { color: blue; }', () => undefined);

            const sheetA = adoptedStyles.get('r35-a')!;
            const sheetB = adoptedStyles.get('r35-b')!;

            //declared in the reverse of the registration order
            const sheets = [...bindComponent(['r35-b', 'r35-a']).adoptedStyleSheets];

            expect(sheets).toContain(sheetA);
            expect(sheets).toContain(sheetB);
            expect(sheets.indexOf(sheetB)).toBeLessThan(sheets.indexOf(sheetA));
        });

        it('should adopt async stylesheets in declared order even when they resolve out of order', async () => {
            //'r35-slow' resolves after 'r35-fast' — pre-fix, network completion order decided
            //adoptedStyleSheets order, and that array *is* cascade order
            let resolveSlow: (v: string) => void = () => {};
            adoptedStyles.add('r35-slow', { get: () => new Promise<string>(r => { resolveSlow = r; }) }, () => undefined);
            adoptedStyles.add('r35-fast', { get: () => Promise.resolve('.f { color: blue; }') }, () => undefined);

            const shadowRoot = bindComponent(['r35-slow', 'r35-fast']);

            //tryPrepare defers its ready callbacks through setTimeout, so real macrotasks are needed
            const flush = async () => {
                for (let i = 0; i < 5; i++) {
                    for (let j = 0; j < 10; j++) { await Promise.resolve(); }
                    await new Promise(r => setTimeout(r, 0));
                }
            };

            await flush();
            resolveSlow('.s { color: red; }');
            await flush();

            const sheets = [...shadowRoot.adoptedStyleSheets];
            const sheetSlow = adoptedStyles.get('r35-slow')!;
            const sheetFast = adoptedStyles.get('r35-fast')!;

            expect(sheets).toContain(sheetSlow);
            expect(sheets).toContain(sheetFast);
            expect(sheets.indexOf(sheetSlow)).toBeLessThan(sheets.indexOf(sheetFast));
        });

        it('should keep the two framework stylesheets first', () => {
            adoptedStyles.add('r35-own', '.o { color: red; }', () => undefined);

            const sheets = [...bindComponent(['r35-own']).adoptedStyleSheets];

            expect(sheets[0]).toBe(adoptedStyles.processingHideCSSStyleSheet);
            expect(sheets[1]).toBe(adoptedStyles.hideCSSStyleSheet);
            expect(sheets[2]).toBe(adoptedStyles.get('r35-own'));
        });

        it('should dedupe repeated names so the completion gate is still reachable', () => {
            adoptedStyles.add('r35-dup', '.d { color: red; }', () => undefined);

            const sheets = [...bindComponent(['r35-dup', 'r35-dup']).adoptedStyleSheets];
            const sheet = adoptedStyles.get('r35-dup')!;

            expect(sheets).toContain(sheet);
            expect(sheets.filter(el => el === sheet).length).toBe(1);
        });

        it('should still adopt a ready style declared before an unregistered one', () => {
            //tryPrepare returns false for an unregistered name and never calls back, so the
            //completion gate has to be re-evaluated from that fallback too — otherwise the
            //sheets already collected are never pushed
            adoptedStyles.add('r35-ready', '.r { color: red; }', () => undefined);
            const sheet = adoptedStyles.get('r35-ready')!;

            const sheets = [...bindComponent(['r35-ready', 'r35-unregistered']).adoptedStyleSheets];

            expect(sheets).toContain(sheet);
            expect(sheets.filter(el => el === sheet).length).toBe(1);
        });

        it('should adopt only the framework stylesheets when every name is unregistered', () => {
            const sheets = [...bindComponent(['r35-nope-1', 'r35-nope-2']).adoptedStyleSheets];

            expect(sheets.length).toBe(2);
            expect(sheets[0]).toBe(adoptedStyles.processingHideCSSStyleSheet);
            expect(sheets[1]).toBe(adoptedStyles.hideCSSStyleSheet);
        });
    });
});
