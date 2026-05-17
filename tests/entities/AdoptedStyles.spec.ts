import { AdoptedStyles } from '../../src/entities/AdoptedStyles';
import { Constants } from '../../src/Constants';

// Polyfill CSSStyleSheet for jsdom
if (typeof CSSStyleSheet !== 'undefined' && !CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function (_text: string) {};
}

describe('AdoptedStyles', () => {
    let adoptedStyles: AdoptedStyles;

    beforeEach(() => {
        adoptedStyles = new AdoptedStyles(() => false);
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should create default hide and processing-hide stylesheets on construction', () => {
        expect(adoptedStyles.hideCSSStyleSheet).toBeDefined();
        expect(adoptedStyles.processingHideCSSStyleSheet).toBeDefined();
    });

    it('should add inline CSS style and get it back', () => {
        adoptedStyles.add('test-style', '.test { color: red; }', () => undefined);

        expect(adoptedStyles.has('test-style')).toBe(true);
        const sheet = adoptedStyles.get('test-style');
        expect(sheet).toBeDefined();
        expect(sheet).toBeInstanceOf(CSSStyleSheet);
    });

    it('should be case-insensitive for name lookup', () => {
        adoptedStyles.add('MyStyle', '.my { color: blue; }', () => undefined);

        expect(adoptedStyles.has('mystyle')).toBe(true);
        expect(adoptedStyles.has('MYSTYLE')).toBe(true);
    });

    it('should return undefined for unknown style', () => {
        expect(adoptedStyles.get('nonexistent')).toBeUndefined();
    });

    it('should log error for duplicate name', () => {
        adoptedStyles.add('dup', '.a {}', () => undefined);
        adoptedStyles.add('dup', '.b {}', () => undefined);

        expect(console.error).toHaveBeenCalled();
    });

    it('should apply style sanitizer when provided', () => {
        const sanitizer = (style: string) => style.replace(/expression\([^)]*\)/gi, '');
        adoptedStyles.add('sanitized', '.safe { color: red; }', () => sanitizer);

        const sheet = adoptedStyles.get('sanitized');
        expect(sheet).toBeDefined();
    });

    it('should handle empty string CSS (isReady immediately)', () => {
        adoptedStyles.add('empty', '', () => undefined);
        expect(adoptedStyles.has('empty')).toBe(true);
        expect(adoptedStyles.isReady('empty')).toBe(true);
    });

    it('should report isReady for inline styles', () => {
        adoptedStyles.add('ready', '.ready {}', () => undefined);
        expect(adoptedStyles.isReady('ready')).toBe(true);
    });

    it('should log error for get() when style is not ready', () => {
        adoptedStyles.add('not-ready-style', 'http://localhost/styles.css', () => undefined);
        expect(adoptedStyles.isReady('not-ready-style')).toBe(false);

        const result = adoptedStyles.get('not-ready-style');
        expect(result).toBeUndefined();
        expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not ready'));
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

        it('should call readyCallBack(false) immediately when already ready (inline CSS)', () => {
            adoptedStyles.add('inline-css', '.test { color: red; }', () => undefined);
            const cb = jest.fn();
            const result = adoptedStyles.tryPrepare('inline-css', cb);
            expect(result).toBe(true);
            expect(cb).toHaveBeenCalledWith(false);
        });

        it('should fetch CSS from URL path and become ready', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('.fetched { color: blue; }')
            });

            adoptedStyles.add('remote-css', 'http://localhost/styles.css', () => undefined);
            expect(adoptedStyles.isReady('remote-css')).toBe(false);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('remote-css', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(adoptedStyles.isReady('remote-css')).toBe(true);
            expect(adoptedStyles.get('remote-css')).toBeInstanceOf(CSSStyleSheet);
        });

        it('should handle fetch returning error status (non-debug: cb not fired)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve('')
            });

            adoptedStyles.add('err-css', 'http://localhost/missing.css', () => undefined);
            const cb = jest.fn();
            adoptedStyles.tryPrepare('err-css', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalled();
            expect(adoptedStyles.isReady('err-css')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should handle fetch returning empty body (non-debug: cb not fired)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('')
            });

            adoptedStyles.add('empty-css', 'http://localhost/empty.css', () => undefined);
            const cb = jest.fn();
            adoptedStyles.tryPrepare('empty-css', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
            expect(adoptedStyles.isReady('empty-css')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should use ITemplateProvider returning string synchronously', () => {
            const provider = { get: () => '.provided { display: block; }' };
            adoptedStyles.add('sync-prov-css', provider as any, () => undefined);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('sync-prov-css', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(adoptedStyles.isReady('sync-prov-css')).toBe(true);
        });

        it('should use ITemplateProvider returning Promise', async () => {
            const provider = { get: () => Promise.resolve('.async { margin: 0; }') };
            adoptedStyles.add('async-prov-css', provider as any, () => undefined);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('async-prov-css', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(adoptedStyles.isReady('async-prov-css')).toBe(true);
        });

        it('should handle ITemplateProvider returning empty value (non-debug: cb not fired)', () => {
            const provider = { get: () => '' };
            adoptedStyles.add('empty-prov-css', provider as any, () => undefined);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('empty-prov-css', cb);
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
            expect(adoptedStyles.isReady('empty-prov-css')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should log error when no style source found (non-debug: cb not fired)', () => {
            const invalidProvider = { noGet: true };
            adoptedStyles.add('no-src-css', invalidProvider as any, () => undefined);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('no-src-css', cb);
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('nor style template'));
            expect(adoptedStyles.isReady('no-src-css')).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should leave fetchInProgress stuck after error in non-debug mode', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            adoptedStyles.add('stuck-css', 'http://localhost/fail.css', () => undefined);

            const cb1 = jest.fn();
            adoptedStyles.tryPrepare('stuck-css', cb1);
            await flushPromises();
            jest.runAllTimers();

            // Error logged but not ready, callback not fired
            expect(console.error).toHaveBeenCalled();
            expect(adoptedStyles.isReady('stuck-css')).toBe(false);
            expect(cb1).not.toHaveBeenCalled();

            // Second attempt just queues (fetchInProgress still true)
            const cb2 = jest.fn();
            adoptedStyles.tryPrepare('stuck-css', cb2);
            await flushPromises();
            jest.runAllTimers();
            expect(cb2).not.toHaveBeenCalled();
        });

        it('should isolate exceptions thrown by one readyCallBack from sibling callbacks (M-23)', async () => {
            // The triggerReadyCallBacks loop wraps each callback in its own try/catch so a throwing
            // callback does not abort delivery to the rest.
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('.ok { color: blue; }')
            });

            adoptedStyles.add('isolated-css', 'http://localhost/ok.css', () => undefined);

            const cb1 = jest.fn(() => { throw new Error('cb1 failed'); });
            const cb2 = jest.fn();
            adoptedStyles.tryPrepare('isolated-css', cb1);
            adoptedStyles.tryPrepare('isolated-css', cb2);

            await flushPromises();
            jest.runAllTimers();

            expect(cb1).toHaveBeenCalled();
            expect(cb2).toHaveBeenCalledWith(true);
        });

        it('should queue multiple callbacks when fetch is in progress', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('.queued { padding: 0; }')
            });

            adoptedStyles.add('queued-css', 'http://localhost/queued.css', () => undefined);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            adoptedStyles.tryPrepare('queued-css', cb1);
            adoptedStyles.tryPrepare('queued-css', cb2);

            await flushPromises();
            jest.runAllTimers();

            expect(cb1).toHaveBeenCalledWith(true);
            expect(cb2).toHaveBeenCalledWith(true);
        });

        it('should set error message as style in debug mode', () => {
            adoptedStyles = new AdoptedStyles(() => true);
            jest.spyOn(console, 'error').mockImplementation();

            const invalidProvider = { noGet: true };
            adoptedStyles.add('debug-css', invalidProvider as any, () => undefined);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('debug-css', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(adoptedStyles.isReady('debug-css')).toBe(true);
        });

        it('should apply style sanitizer during setStyleTemplate', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('.fetched { color: red; }')
            });

            const sanitizer = jest.fn((css: string) => css.replace('red', 'blue'));
            adoptedStyles.add('san-css', 'http://localhost/sanitized.css', () => sanitizer);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('san-css', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(sanitizer).toHaveBeenCalledWith('.fetched { color: red; }');
            expect(adoptedStyles.isReady('san-css')).toBe(true);
        });

        it('should handle fetch with debug mode showing error as style in error-status case', async () => {
            adoptedStyles = new AdoptedStyles(() => true);
            jest.spyOn(console, 'error').mockImplementation();

            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('')
            });

            adoptedStyles.add('debug-err-css', 'http://localhost/debug-err.css', () => undefined);

            const cb = jest.fn();
            adoptedStyles.tryPrepare('debug-err-css', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(adoptedStyles.isReady('debug-err-css')).toBe(true);
        });
    });
});
