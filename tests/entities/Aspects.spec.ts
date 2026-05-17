import { Aspects } from '../../src/entities/Aspects';
import { Injectables } from '../../src/entities/Injectables';
import { IAspectContext } from '../../src/interfaces/contexts/IAspectContext';
import { Constants } from '../../src/Constants';

// Polyfill CSSStyleSheet for jsdom
if (typeof CSSStyleSheet !== 'undefined' && !CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function (_text: string) {};
}

describe('Aspects', () => {
    let injectables: Injectables;
    let aspects: Aspects;

    beforeEach(() => {
        injectables = new Injectables();
        aspects = new Aspects(injectables, () => false);
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should add an aspect and has() returns true', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('my-aspect', MyAspect as any, [], undefined, undefined, () => undefined);
        expect(aspects.has('my-aspect')).toBe(true);
    });

    it('should be case-insensitive on lookup', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('MyAspect', MyAspect as any, [], undefined, undefined, () => undefined);
        expect(aspects.has('myaspect')).toBe(true);
        expect(aspects.has('MYASPECT')).toBe(true);
    });

    it('should log error for duplicate name', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('dup', MyAspect as any, [], undefined, undefined, () => undefined);
        aspects.add('dup', MyAspect as any, [], undefined, undefined, () => undefined);
        expect(console.error).toHaveBeenCalled();
    });

    it('should add aspect with inline styles', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('styled', MyAspect as any, [], ':host { color: red; }', undefined, () => undefined);
        expect(aspects.has('styled')).toBe(true);

        const styles = aspects.getStyles('styled');
        expect(styles).toBeDefined();
    });

    it('should add aspect with adopted style names', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('adopted', MyAspect as any, [], undefined, ['style-a', 'style-b'], () => undefined);
        expect(aspects.has('adopted')).toBe(true);

        const styles = aspects.getStyles('adopted');
        expect(styles).toBeDefined();
        expect(styles![1]).toEqual(['style-a', 'style-b']);
    });

    it('should instantiate an aspect context', () => {
        class MyAspect implements IAspectContext {
            data: any;
        }

        aspects.add('inst', MyAspect as any, [], undefined, undefined, () => undefined);
        const result = aspects.instantiate('inst');
        expect(result).toBeDefined();
        expect(result![0]).toBeInstanceOf(MyAspect);
    });

    it('should return undefined for unknown aspect instantiate', () => {
        const result = aspects.instantiate('nonexistent');
        expect(result).toBeUndefined();
    });

    it('should return undefined for unknown aspect getStyles', () => {
        const result = aspects.getStyles('nonexistent');
        expect(result).toBeUndefined();
    });

    it('should mark isReady for aspects without styles', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('nostyle', MyAspect as any, [], undefined, undefined, () => undefined);
        expect(aspects.isReady('nostyle')).toBe(true);
    });

    it('should still instantiate when aspect is registered but not ready', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('not-ready', MyAspect as any, [], 'http://localhost/styles.css', undefined, () => undefined);
        expect(aspects.isReady('not-ready')).toBe(false);

        const result = aspects.instantiate('not-ready');
        expect(result).toBeDefined();
        expect(result![0]).toBeInstanceOf(MyAspect);
    });

    it('should log error and return undefined for getStyles when aspect is not ready', () => {
        class MyAspect implements IAspectContext {}

        aspects.add('not-ready-style', MyAspect as any, [], 'http://localhost/styles.css', undefined, () => undefined);
        expect(aspects.isReady('not-ready-style')).toBe(false);

        const result = aspects.getStyles('not-ready-style');
        expect(result).toBeUndefined();
        expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not ready'));
    });

    it('should return correct hasStyles flag from instantiate', () => {
        class WithStyles implements IAspectContext {}
        class NoStyles implements IAspectContext {}

        aspects.add('has-styles', WithStyles as any, [], ':host { color: red; }', undefined, () => undefined);
        aspects.add('no-styles', NoStyles as any, [], undefined, undefined, () => undefined);

        const withResult = aspects.instantiate('has-styles');
        expect(withResult).toBeDefined();
        expect(withResult![1]).toBe(true);

        const noResult = aspects.instantiate('no-styles');
        expect(noResult).toBeDefined();
        expect(noResult![1]).toBe(false);
    });

    it('should add aspect with style provider (object)', () => {
        class MyAspect implements IAspectContext {}
        const provider = { get: () => ':host { display: block; }' };
        aspects.add('prov-aspect', MyAspect as any, [], provider as any, undefined, () => undefined);
        expect(aspects.has('prov-aspect')).toBe(true);
        expect(aspects.isReady('prov-aspect')).toBe(false);
    });

    it('should add aspect with .css path', () => {
        class MyAspect implements IAspectContext {}
        aspects.add('css-path', MyAspect as any, [], 'http://localhost/styles.css', undefined, () => undefined);
        expect(aspects.has('css-path')).toBe(true);
        expect(aspects.isReady('css-path')).toBe(false);
    });

    it('should detect inline style with { character', () => {
        class MyAspect implements IAspectContext {}
        aspects.add('inline-brace', MyAspect as any, [], ':host { color: red; }', undefined, () => undefined);
        expect(aspects.isReady('inline-brace')).toBe(true);
    });

    it('should detect inline style with newline character', () => {
        class MyAspect implements IAspectContext {}
        aspects.add('inline-nl', MyAspect as any, [], ':host\n{ color: red; }', undefined, () => undefined);
        expect(aspects.isReady('inline-nl')).toBe(true);
    });

    it('should detect inline style with tab character', () => {
        class MyAspect implements IAspectContext {}
        aspects.add('inline-tab', MyAspect as any, [], ':host\t{ color: red; }', undefined, () => undefined);
        expect(aspects.isReady('inline-tab')).toBe(true);
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

        it('should call readyCallBack(false) immediately when already ready', () => {
            class MyAspect implements IAspectContext {}
            aspects.add('ready-a', MyAspect as any, [], ':host { color: red; }', undefined, () => undefined);

            const cb = jest.fn();
            const result = aspects.tryPrepare('ready-a', cb);
            expect(result).toBe(true);
            expect(cb).toHaveBeenCalledWith(false);
        });

        it('should fetch CSS from URL path and become ready', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(':host { color: blue; }')
            });

            class MyAspect implements IAspectContext {}
            aspects.add('remote-a', MyAspect as any, [], 'http://localhost/aspect.css', undefined, () => undefined);
            expect(aspects.isReady('remote-a')).toBe(false);

            const cb = jest.fn();
            aspects.tryPrepare('remote-a', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(aspects.isReady('remote-a')).toBe(true);
        });

        it('should handle fetch returning error status (non-debug: cb not fired)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve('')
            });

            class MyAspect implements IAspectContext {}
            aspects.add('err-a', MyAspect as any, [], 'http://localhost/missing.css', undefined, () => undefined);

            const cb = jest.fn();
            aspects.tryPrepare('err-a', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(aspects.isReady('err-a')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should handle fetch returning empty body (non-debug: cb not fired)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('')
            });

            class MyAspect implements IAspectContext {}
            aspects.add('empty-a', MyAspect as any, [], 'http://localhost/empty.css', undefined, () => undefined);

            const cb = jest.fn();
            aspects.tryPrepare('empty-a', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
            expect(aspects.isReady('empty-a')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should use ITemplateProvider returning string synchronously', () => {
            class MyAspect implements IAspectContext {}
            const provider = { get: () => ':host { display: block; }' };
            aspects.add('sync-prov-a', MyAspect as any, [], provider as any, undefined, () => undefined);

            const cb = jest.fn();
            aspects.tryPrepare('sync-prov-a', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(aspects.isReady('sync-prov-a')).toBe(true);
        });

        it('should use ITemplateProvider returning Promise', async () => {
            class MyAspect implements IAspectContext {}
            const provider = { get: () => Promise.resolve(':host { margin: 0; }') };
            aspects.add('async-prov-a', MyAspect as any, [], provider as any, undefined, () => undefined);

            const cb = jest.fn();
            aspects.tryPrepare('async-prov-a', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(aspects.isReady('async-prov-a')).toBe(true);
        });

        it('should handle ITemplateProvider returning empty value (non-debug: cb not fired)', () => {
            class MyAspect implements IAspectContext {}
            const provider = { get: () => '' };
            aspects.add('empty-prov-a', MyAspect as any, [], provider as any, undefined, () => undefined);

            const cb = jest.fn();
            aspects.tryPrepare('empty-prov-a', cb);
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
            expect(aspects.isReady('empty-prov-a')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should log error when no style source found', () => {
            class MyAspect implements IAspectContext {}
            aspects.add('no-src-a', MyAspect as any, [], undefined as any, undefined, () => undefined);

            const cb = jest.fn();
            aspects.tryPrepare('no-src-a', cb);

            // undefined/no style → isStyleTemplateReady = true in constructor, so readyCallBack(false)
            expect(cb).toHaveBeenCalledWith(false);
        });

        it('should leave fetchInProgress stuck after error in non-debug mode', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            class MyAspect implements IAspectContext {}
            aspects.add('stuck-a', MyAspect as any, [], 'http://localhost/fail.css', undefined, () => undefined);

            const cb1 = jest.fn();
            aspects.tryPrepare('stuck-a', cb1);
            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(aspects.isReady('stuck-a')).toBe(false);
            expect(cb1).not.toHaveBeenCalled();

            // Second attempt just queues
            const cb2 = jest.fn();
            aspects.tryPrepare('stuck-a', cb2);
            await flushPromises();
            jest.runAllTimers();
            expect(cb2).not.toHaveBeenCalled();
        });

        it('should queue multiple callbacks when fetch is in progress', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(':host { padding: 0; }')
            });

            class MyAspect implements IAspectContext {}
            aspects.add('queued-a', MyAspect as any, [], 'http://localhost/queued.css', undefined, () => undefined);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            aspects.tryPrepare('queued-a', cb1);
            aspects.tryPrepare('queued-a', cb2);

            await flushPromises();
            jest.runAllTimers();

            expect(cb1).toHaveBeenCalledWith(true);
            expect(cb2).toHaveBeenCalledWith(true);
        });


        it('should set error as style in debug mode', async () => {
            aspects = new Aspects(injectables, () => true);
            jest.spyOn(console, 'error').mockImplementation();

            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            class MyAspect implements IAspectContext {}
            aspects.add('debug-a', MyAspect as any, [], 'http://localhost/debug.css', undefined, () => undefined);

            const cb = jest.fn();
            aspects.tryPrepare('debug-a', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(aspects.isReady('debug-a')).toBe(true);
        });

        it('should apply style sanitizer during fetch', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(':host { color: red; }')
            });

            class MyAspect implements IAspectContext {}
            const sanitizer = jest.fn((css: string) => css.replace('red', 'blue'));
            aspects.add('san-a', MyAspect as any, [], 'http://localhost/sanitized.css', undefined, () => sanitizer);

            const cb = jest.fn();
            aspects.tryPrepare('san-a', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(sanitizer).toHaveBeenCalledWith(':host { color: red; }');
            expect(aspects.isReady('san-a')).toBe(true);
        });
    });
});
