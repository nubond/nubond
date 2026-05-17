import { Templates } from '../../src/entities/Templates';
import { Constants } from '../../src/Constants';

describe('Templates', () => {
    let templates: Templates;

    beforeEach(() => {
        templates = new Templates(() => false);
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should add an inline HTML template and get it back', () => {
        templates.add('myTpl', '<div>Hello</div>', () => undefined);

        expect(templates.has('myTpl')).toBe(true);
        const node = templates.get('myTpl');
        expect(node).toBeDefined();
    });

    it('should be case-insensitive for name lookup', () => {
        templates.add('MyTemplate', '<span>Test</span>', () => undefined);

        expect(templates.has('mytemplate')).toBe(true);
        expect(templates.has('MYTEMPLATE')).toBe(true);
    });

    it('should return undefined for unknown template', () => {
        expect(templates.get('nonexistent')).toBeUndefined();
    });

    it('should return false for has() on unknown template', () => {
        expect(templates.has('nonexistent')).toBe(false);
    });

    it('should log error for duplicate name', () => {
        templates.add('dup', '<div>1</div>', () => undefined);
        templates.add('dup', '<div>2</div>', () => undefined);

        expect(console.error).toHaveBeenCalled();
    });

    it('should apply HTML sanitizer when provided', () => {
        const sanitizer = (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, '');
        templates.add('sanitized', '<div>safe</div><script>evil()</script>', () => sanitizer);

        const node = templates.get('sanitized');
        expect(node).toBeDefined();
    });

    it('should clone the template node on get', () => {
        templates.add('cloneable', '<p>content</p>', () => undefined);

        const node1 = templates.get('cloneable');
        const node2 = templates.get('cloneable');
        expect(node1).not.toBe(node2);
    });

    it('should report isReady for inline templates', () => {
        templates.add('ready', '<div>ready</div>', () => undefined);
        expect(templates.isReady('ready')).toBe(true);
    });

    it('should return undefined for isReady on unknown template', () => {
        expect(templates.isReady('unknown')).toBeUndefined();
    });

    it('should log error and return undefined for get() when template is not ready', () => {
        templates.add('async-tpl', 'http://localhost/template.html', () => undefined);
        expect(templates.isReady('async-tpl')).toBe(false);

        const node = templates.get('async-tpl');
        expect(node).toBeUndefined();
        expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not ready'));
    });

    it('should invoke the sanitizer function on the content', () => {
        const sanitizer = jest.fn((html: string) => html.replace('evil', 'safe'));
        templates.add('san-verify', '<div>evil content</div>', () => sanitizer);

        expect(sanitizer).toHaveBeenCalledWith('<div>evil content</div>');

        const node = templates.get('san-verify') as DocumentFragment;
        expect(node).toBeDefined();
        expect((node.firstChild as HTMLElement).textContent).toBe('safe content');
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

        it('should call readyCallBack(false) immediately when already ready (inline template)', () => {
            templates.add('inline', '<div>Hello</div>', () => undefined);
            const cb = jest.fn();
            const result = templates.tryPrepare('inline', cb);
            expect(result).toBe(true);
            expect(cb).toHaveBeenCalledWith(false);
        });

        it('should return false for tryPrepare on unknown template', () => {
            const cb = jest.fn();
            const result = templates.tryPrepare('nonexistent', cb);
            expect(result).toBe(false);
            expect(cb).not.toHaveBeenCalled();
        });

        it('should fetch HTML from URL path and become ready', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched</div>')
            });

            templates.add('remote', 'http://localhost/template.html', () => undefined);
            expect(templates.isReady('remote')).toBe(false);

            const cb = jest.fn();
            templates.tryPrepare('remote', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(templates.isReady('remote')).toBe(true);
            const node = templates.get('remote');
            expect(node).toBeDefined();
        });

        it('should handle fetch returning error status', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve('')
            });

            templates.add('err-fetch', 'http://localhost/missing.html', () => undefined);
            const cb = jest.fn();
            templates.tryPrepare('err-fetch', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining("Invalid template 'err-fetch'"));
        });

        it('should handle fetch returning empty body', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('')
            });

            templates.add('empty-fetch', 'http://localhost/empty.html', () => undefined);
            const cb = jest.fn();
            templates.tryPrepare('empty-fetch', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
        });

        it('should use ITemplateProvider returning string synchronously', () => {
            const provider = { get: () => '<div>from provider</div>' };
            templates.add('sync-provider', provider as any, () => undefined);

            const cb = jest.fn();
            templates.tryPrepare('sync-provider', cb);

            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(templates.isReady('sync-provider')).toBe(true);
        });

        it('should use ITemplateProvider returning Promise', async () => {
            const provider = { get: () => Promise.resolve('<div>async provider</div>') };
            templates.add('async-provider', provider as any, () => undefined);

            const cb = jest.fn();
            templates.tryPrepare('async-provider', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(templates.isReady('async-provider')).toBe(true);
        });

        it('should handle ITemplateProvider returning empty value', () => {
            const provider = { get: () => '' };
            templates.add('empty-provider', provider as any, () => undefined);

            const cb = jest.fn();
            templates.tryPrepare('empty-provider', cb);

            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
        });

        it('should handle ITemplateProvider returning Promise that resolves to empty', async () => {
            const provider = { get: () => Promise.resolve('') };
            templates.add('empty-async-provider', provider as any, () => undefined);

            const cb = jest.fn();
            templates.tryPrepare('empty-async-provider', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
        });

        it('should log error when no template, url, or provider found', () => {
            // Pass an object without a valid get method to trigger the errorCallBack() branch
            const invalidProvider = { noGet: true };
            templates.add('no-source', invalidProvider as any, () => undefined);

            const cb = jest.fn();
            templates.tryPrepare('no-source', cb);

            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('nor html template'));
        });

        it('should return false after exceeding MAX_PREPARE_ATTEMPTS', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: () => Promise.resolve('')
            });

            templates.add('max-attempts', 'http://localhost/fail.html', () => undefined);

            for (let i = 0; i < 4; i++) {
                const cb = jest.fn();
                templates.tryPrepare('max-attempts', cb);
                await flushPromises();
                jest.runAllTimers();
            }

            const cb = jest.fn();
            const result = templates.tryPrepare('max-attempts', cb);
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('Unable to get template'));
        });

        it('should queue multiple callbacks when fetch is in progress', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched</div>')
            });

            templates.add('queued', 'http://localhost/queued.html', () => undefined);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            templates.tryPrepare('queued', cb1);
            templates.tryPrepare('queued', cb2);

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
            templates.add('iso-tpl', 'http://localhost/iso.html', () => undefined);

            const cb1 = jest.fn(() => { throw new Error('cb1 failed'); });
            const cb2 = jest.fn();
            templates.tryPrepare('iso-tpl', cb1);
            templates.tryPrepare('iso-tpl', cb2);

            await flushPromises();
            jest.runAllTimers();

            expect(cb1).toHaveBeenCalled();
            // cb2 must still receive its notification despite cb1 throwing.
            expect(cb2).toHaveBeenCalledWith(true);
        });

        it('should set error message as template in debug mode', () => {
            templates = new Templates(() => true);
            jest.spyOn(console, 'error').mockImplementation();

            // Pass an object without valid get to trigger errorCallBack() → debug sets template
            const invalidProvider = { noGet: true };
            templates.add('debug-tpl', invalidProvider as any, () => undefined);

            const cb = jest.fn();
            templates.tryPrepare('debug-tpl', cb);

            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(templates.isReady('debug-tpl')).toBe(true);
            const node = templates.get('debug-tpl');
            expect(node).toBeDefined();
        });

        it('should handle fetch network rejection', async () => {
            (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));

            templates.add('net-err', 'http://localhost/network-fail.html', () => undefined);
            const cb = jest.fn();
            templates.tryPrepare('net-err', cb);

            // Need enough microtask flushes for the full promise chain
            for (let i = 0; i < 20; i++) await Promise.resolve();
            jest.runAllTimers();
            for (let i = 0; i < 20; i++) await Promise.resolve();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle fetch response.text() rejection (covers reason handler)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.reject(new Error('text() failed'))
            });

            templates.add('text-reject', 'http://localhost/text-reject.html', () => undefined);
            const cb = jest.fn();
            templates.tryPrepare('text-reject', cb);

            for (let i = 0; i < 20; i++) await Promise.resolve();
            jest.runAllTimers();
            for (let i = 0; i < 20; i++) await Promise.resolve();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalled();
        });
    });
});
