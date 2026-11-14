import { Containers } from '../../src/entities/Containers';
import { Injectables } from '../../src/entities/Injectables';
import { IContext } from '../../src/interfaces/contexts/IContext';
import { Constants } from '../../src/Constants';

describe('Containers', () => {
    let injectables: Injectables;
    let containers: Containers;
    const mockBinderCreator = () => ({} as any);

    beforeEach(() => {
        injectables = new Injectables();
        containers = new Containers(injectables, () => false);
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should add a container and has() returns true', () => {
        class MyCtx implements IContext {}

        containers.add('my-container', MyCtx as any, [],
            '<div>template</div>', mockBinderCreator, () => undefined);
        expect(containers.has('my-container')).toBe(true);
    });

    it('should be case-insensitive on lookup', () => {
        class MyCtx implements IContext {}

        containers.add('MyContainer', MyCtx as any, [],
            '<div>template</div>', mockBinderCreator, () => undefined);
        expect(containers.has('mycontainer')).toBe(true);
    });

    it('should log error for duplicate name', () => {
        class MyCtx implements IContext {}

        containers.add('dup', MyCtx as any, [], '<div/>', mockBinderCreator, () => undefined);
        containers.add('dup', MyCtx as any, [], '<div/>', mockBinderCreator, () => undefined);
        expect(console.error).toHaveBeenCalled();
    });

    it('should mark isReady for inline templates', () => {
        class MyCtx implements IContext {}

        containers.add('ready', MyCtx as any, [],
            '<div>ready</div>', mockBinderCreator, () => undefined);
        expect(containers.isReady('ready')).toBe(true);
    });

    it('should instantiate binder data when ready', () => {
        class MyCtx implements IContext {}

        containers.add('binder', MyCtx as any, [],
            '<div>content</div>', mockBinderCreator, () => undefined);

        const binderData = containers.instantiateBinder('binder', null as any, null as any);
        expect(binderData).toBeDefined();
        expect(binderData!.template).toBeDefined();
    });

    it('should instantiate context', () => {
        class MyCtx implements IContext {
            name = 'test';
        }

        containers.add('ctx', MyCtx as any, [],
            '<div>content</div>', mockBinderCreator, () => undefined);

        const ctx = containers.instantiateContext('ctx') as MyCtx;
        expect(ctx).toBeInstanceOf(MyCtx);
        expect(ctx.name).toBe('test');
    });

    it('should return undefined for unknown container instantiateBinder', () => {
        expect(containers.instantiateBinder('nonexistent', null as any, null as any)).toBeUndefined();
    });

    it('should return undefined for unknown container instantiateContext', () => {
        expect(containers.instantiateContext('nonexistent')).toBeUndefined();
    });

    it('should not apply the HTML sanitizer to an inline template', () => {
        class MyCtx implements IContext {}
        const sanitizer = jest.fn((html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, ''));

        containers.add('sanitized', MyCtx as any, [],
            '<div>safe</div>', mockBinderCreator, () => sanitizer);
        expect(containers.has('sanitized')).toBe(true);
        expect(sanitizer).not.toHaveBeenCalled();
    });

    it('should log error and return undefined for instantiateBinder when template is not ready', () => {
        class MyCtx implements IContext {}

        containers.add('async-binder', MyCtx as any, [],
            '/template.html', mockBinderCreator, () => undefined);
        expect(containers.isReady('async-binder')).toBe(false);

        const result = containers.instantiateBinder('async-binder', null as any, null as any);
        expect(result).toBeUndefined();
        expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not ready'));
    });

    it('should forward dependency injection args in instantiateContext', () => {
        const element = document.createElement('div');

        class MyCtx implements IContext {
            constructor(public el: HTMLElement) {}
        }

        injectables.register(MyCtx as any, [HTMLElement as any]);
        containers.add('ctx-di', MyCtx as any, [],
            '<div>content</div>', mockBinderCreator, () => undefined);

        const ctx = containers.instantiateContext('ctx-di', element) as any;
        expect(ctx).toBeInstanceOf(MyCtx);
        expect(ctx.el).toBe(element);
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
            class MyCtx implements IContext {}
            containers.add('ready-c', MyCtx as any, [],
                '<div>ready</div>', mockBinderCreator, () => undefined);

            const cb = jest.fn();
            const result = containers.tryPrepare('ready-c', cb);
            expect(result).toBe(true);
            expect(cb).toHaveBeenCalledWith(false);
        });

        it('should fetch HTML from URL path and become ready', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched</div>')
            });

            class MyCtx implements IContext {}
            containers.add('remote-c', MyCtx as any, [],
                '/container.html', mockBinderCreator, () => undefined);
            expect(containers.isReady('remote-c')).toBe(false);

            const cb = jest.fn();
            containers.tryPrepare('remote-c', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(containers.isReady('remote-c')).toBe(true);
        });

        it('should handle fetch returning error status', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IContext {}
            containers.add('err-c', MyCtx as any, [],
                '/missing.html', mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('err-c', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining("Invalid container 'err-c'"));
        });

        it('should handle fetch returning empty body', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('')
            });

            class MyCtx implements IContext {}
            containers.add('empty-c', MyCtx as any, [],
                '/empty.html', mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('empty-c', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
        });

        it('should use ITemplateProvider returning string synchronously', () => {
            class MyCtx implements IContext {}
            const provider = { get: () => '<div>from provider</div>' };
            containers.add('sync-prov-c', MyCtx as any, [],
                provider as any, mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('sync-prov-c', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(containers.isReady('sync-prov-c')).toBe(true);
        });

        it('should use ITemplateProvider returning Promise', async () => {
            class MyCtx implements IContext {}
            const provider = { get: () => Promise.resolve('<div>async</div>') };
            containers.add('async-prov-c', MyCtx as any, [],
                provider as any, mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('async-prov-c', cb);

            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(containers.isReady('async-prov-c')).toBe(true);
        });

        it('should handle ITemplateProvider returning empty value', () => {
            class MyCtx implements IContext {}
            const provider = { get: () => '' };
            containers.add('empty-prov-c', MyCtx as any, [],
                provider as any, mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('empty-prov-c', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not a string or this string is empty'));
        });

        it('should log error when no template source found', () => {
            class MyCtx implements IContext {}
            const invalidProvider = { noGet: true };
            containers.add('no-src-c', MyCtx as any, [],
                invalidProvider as any, mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('no-src-c', cb);
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

            class MyCtx implements IContext {}
            containers.add('max-c', MyCtx as any, [],
                '/fail.html', mockBinderCreator, () => undefined);

            for (let i = 0; i < 4; i++) {
                const cb = jest.fn();
                containers.tryPrepare('max-c', cb);
                await flushPromises();
                jest.runAllTimers();
            }

            const cb = jest.fn();
            const result = containers.tryPrepare('max-c', cb);
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('Unable to get container'));
        });

        describe('a ready callback re-entering tryPrepare after a failed fetch (snapshot before invoking)', () => {
            // A ready callback (Container/Template commit) calls tryPrepare again. The pending callbacks must
            // be moved out and _fetchInProgress cleared BEFORE they are invoked; otherwise the re-entrant
            // call is appended to the array being iterated and the loop never ends (OOM / CPU spin). The cap
            // turns such a regression into a failing assertion instead of a hung Jest worker.
            const CAP = 50;

            it('retries until MAX_PREPARE_ATTEMPTS and then stops (provider always rejects)', async () => {
                const get = jest.fn().mockRejectedValue(new Error('boom'));
                class Ctx implements IContext {}
                containers.add('reenter-always', Ctx as any, [], { get } as any, mockBinderCreator, () => undefined);

                let calls = 0;
                const cb = () => {
                    if (++calls > CAP) { return; }
                    containers.tryPrepare('reenter-always', cb);
                };
                containers.tryPrepare('reenter-always', cb);

                for (let i = 0; i < 10; i++) { await flushPromises(); jest.runAllTimers(); }

                expect(calls).toBe(3);
                expect(get).toHaveBeenCalledTimes(3);
                expect(containers.tryPrepare('reenter-always', jest.fn())).toBe(false);
            });

            it('recovers when the provider rejects once and then resolves', async () => {
                const get = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('<b>ok</b>');
                class Ctx implements IContext {}
                containers.add('reenter-once', Ctx as any, [], { get } as any, mockBinderCreator, () => undefined);

                const results: Array<boolean> = [];
                let calls = 0;
                // like a real Container/Template commit: only a not-yet-ready entity is asked again
                const cb = (async: boolean) => {
                    results.push(async);
                    if ((++calls > CAP) || !async) { return; }
                    containers.tryPrepare('reenter-once', cb);
                };
                containers.tryPrepare('reenter-once', cb);

                for (let i = 0; i < 10; i++) { await flushPromises(); jest.runAllTimers(); }

                expect(get).toHaveBeenCalledTimes(2);
                // failure -> async callback, success -> async callback, then the ready entity answers synchronously
                expect(results).toEqual([true, true, false]);
            });

            it('invokes queued callbacks in registration order', async () => {
                let resolve: (s: string) => void = () => {};
                const get = jest.fn(() => new Promise<string>(r => { resolve = r; }));
                class Ctx implements IContext {}
                containers.add('reenter-order', Ctx as any, [], { get } as any, mockBinderCreator, () => undefined);

                const order: Array<number> = [];
                containers.tryPrepare('reenter-order', () => order.push(1));
                containers.tryPrepare('reenter-order', () => order.push(2));
                containers.tryPrepare('reenter-order', () => order.push(3));
                resolve('<b>ok</b>');

                for (let i = 0; i < 5; i++) { await flushPromises(); jest.runAllTimers(); }

                expect(order).toEqual([1, 2, 3]);
                expect(get).toHaveBeenCalledTimes(1);
            });
        });

        it('should queue multiple callbacks when fetch is in progress', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched</div>')
            });

            class MyCtx implements IContext {}
            containers.add('queued-c', MyCtx as any, [],
                '/queued.html', mockBinderCreator, () => undefined);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            containers.tryPrepare('queued-c', cb1);
            containers.tryPrepare('queued-c', cb2);

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

            class MyCtx implements IContext {}
            containers.add('iso-c', MyCtx as any, [],
                '/iso.html', mockBinderCreator, () => undefined);

            const cb1 = jest.fn(() => { throw new Error('cb1 failed'); });
            const cb2 = jest.fn();
            containers.tryPrepare('iso-c', cb1);
            containers.tryPrepare('iso-c', cb2);

            await flushPromises();
            jest.runAllTimers();

            expect(cb1).toHaveBeenCalled();
            expect(cb2).toHaveBeenCalledWith(true);
        });

        it('should set error message as template in debug mode', async () => {
            containers = new Containers(injectables, () => true);
            jest.spyOn(console, 'error').mockImplementation();

            class MyCtx implements IContext {}
            const invalidProvider = { noGet: true };
            containers.add('debug-c', MyCtx as any, [],
                invalidProvider as any, mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('debug-c', cb);
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(containers.isReady('debug-c')).toBe(true);
        });

        it('should log error for instantiateContext when not ready', () => {
            class MyCtx implements IContext {}
            containers.add('not-ready-ctx', MyCtx as any, [],
                '/template.html', mockBinderCreator, () => undefined);

            const result = containers.instantiateContext('not-ready-ctx');
            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not ready'));
        });

        describe('L-31: a throwing success callback is reported, not swallowed', () => {
            const throwingSanitizer = () => (_html: string): string => { throw new Error('sanitize-boom'); };

            it('logs the exception and still releases the ready callbacks for a fetched template', async () => {
                (globalThis as any).fetch = jest.fn().mockResolvedValue({
                    ok: true,
                    text: () => Promise.resolve('<div>fetched</div>')
                });

                class MyCtx implements IContext {}
                containers.add('l31-fetch', MyCtx as any, [],
                    '/l31.html', mockBinderCreator, throwingSanitizer);

                const cb = jest.fn();
                expect(containers.tryPrepare('l31-fetch', cb)).toBe(true);

                await flushPromises();
                jest.runAllTimers();

                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    expect.stringContaining("Invalid container 'l31-fetch'"));
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    expect.stringContaining("successCallBack for template '/l31.html' failed with exception: Error: sanitize-boom"));
                expect(cb).toHaveBeenCalledWith(true);
                expect(containers.isReady('l31-fetch')).toBe(false);
            });

            it('lets the next attempt start a new fetch (the entity is not stuck in progress)', async () => {
                (globalThis as any).fetch = jest.fn().mockResolvedValue({
                    ok: true,
                    text: () => Promise.resolve('<div>fetched</div>')
                });

                class MyCtx implements IContext {}
                containers.add('l31-retry', MyCtx as any, [],
                    '/l31-retry.html', mockBinderCreator, throwingSanitizer);

                containers.tryPrepare('l31-retry', jest.fn());
                await flushPromises();
                jest.runAllTimers();

                containers.tryPrepare('l31-retry', jest.fn());
                await flushPromises();
                jest.runAllTimers();

                expect((globalThis as any).fetch).toHaveBeenCalledTimes(2);
            });

            it('reports the exception from a Promise-returning provider and releases the callbacks', async () => {
                class MyCtx implements IContext {}
                const provider = { get: () => Promise.resolve('<div>async</div>') };
                containers.add('l31-async-prov', MyCtx as any, [],
                    provider as any, mockBinderCreator, throwingSanitizer);

                const cb = jest.fn();
                containers.tryPrepare('l31-async-prov', cb);

                await flushPromises();
                jest.runAllTimers();

                expect(cb).toHaveBeenCalledWith(true);
                expect(containers.isReady('l31-async-prov')).toBe(false);
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'l31-async-prov': response does not indicate success: fetchData successCallBack failed with exception: Error: sanitize-boom.");
            });

            it('reports the exception from a synchronous provider, releases the callbacks and lets the next attempt retry', () => {
                class MyCtx implements IContext {}
                const get = jest.fn(() => '<div>sync</div>');
                containers.add('l31-sync-prov', MyCtx as any, [],
                    { get } as any, mockBinderCreator, throwingSanitizer);

                const cb = jest.fn();
                expect(() => containers.tryPrepare('l31-sync-prov', cb)).not.toThrow();
                jest.runAllTimers();

                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'l31-sync-prov': response does not indicate success: fetchData successCallBack failed with exception: Error: sanitize-boom.");
                expect(cb).toHaveBeenCalledWith(true);
                expect(containers.isReady('l31-sync-prov')).toBe(false);

                // Not stuck in progress: the next attempt calls the provider again.
                const cb2 = jest.fn();
                expect(containers.tryPrepare('l31-sync-prov', cb2)).toBe(true);
                jest.runAllTimers();
                expect(cb2).toHaveBeenCalledWith(true);
                expect(get).toHaveBeenCalledTimes(2);
            });

            it('reports a throwing provider get() and releases the callbacks', () => {
                class MyCtx implements IContext {}
                const provider = { get: () => { throw new Error('get-boom'); } };
                containers.add('l31-get-throws', MyCtx as any, [],
                    provider as any, mockBinderCreator, () => undefined);

                const cb = jest.fn();
                expect(() => containers.tryPrepare('l31-get-throws', cb)).not.toThrow();
                jest.runAllTimers();

                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'l31-get-throws': response does not indicate success: fetchData templateProvider.get() failed with exception: Error: get-boom.");
                expect(console.error).toHaveBeenCalledTimes(1);
                expect(cb).toHaveBeenCalledWith(true);
            });

            it('with showDebugInfo on, a synchronous provider releases the callbacks (L-52a) and runs errorCallBack once (L-52b)', () => {
                containers = new Containers(injectables, () => true);

                class MyCtx implements IContext {}
                const get = jest.fn(() => '<div>sync</div>');
                containers.add('l31-sync-debug', MyCtx as any, [],
                    { get } as any, mockBinderCreator, throwingSanitizer);

                const cb = jest.fn();
                expect(() => containers.tryPrepare('l31-sync-debug', cb)).not.toThrow();
                jest.runAllTimers();

                // successCallBack throws -> errorCallBack throws in setHtmlTemplate(errorMessage) (its finally
                // still triggers the ready callbacks) -> fetchData logs that throw; errorCallBack is not re-run.
                expect(console.error).toHaveBeenCalledTimes(2);
                expect(console.error).toHaveBeenNthCalledWith(1, `${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'l31-sync-debug': response does not indicate success: fetchData successCallBack failed with exception: Error: sanitize-boom.");
                expect(console.error).toHaveBeenNthCalledWith(2, `${Constants.DISPLAY_NAME}: `,
                    'fetchData errorCallBack failed with exception: Error: sanitize-boom');
                expect(cb).toHaveBeenCalledTimes(1);
                expect(cb).toHaveBeenCalledWith(true);
                expect(containers.isReady('l31-sync-debug')).toBe(false);

                // Not stuck in progress: the next attempt calls the provider again.
                const cb2 = jest.fn();
                expect(containers.tryPrepare('l31-sync-debug', cb2)).toBe(true);
                jest.runAllTimers();
                expect(cb2).toHaveBeenCalledTimes(1);
                expect(get).toHaveBeenCalledTimes(2);
            });

            it('with showDebugInfo on, a throwing sanitizer on the error template still releases the callbacks (L-52a)', async () => {
                containers = new Containers(injectables, () => true);
                (globalThis as any).fetch = jest.fn().mockResolvedValue({
                    ok: true,
                    text: () => Promise.resolve('<div>fetched</div>')
                });

                class MyCtx implements IContext {}
                containers.add('l31-debug', MyCtx as any, [],
                    '/l31-debug.html', mockBinderCreator, throwingSanitizer);

                const cb = jest.fn();
                containers.tryPrepare('l31-debug', cb);
                await flushPromises();
                jest.runAllTimers();

                // setHtmlTemplate(errorMessage) throws inside errorCallBack; its finally still triggers the
                // ready callbacks and fetchData logs the rethrown exception.
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    expect.stringContaining("successCallBack for template '/l31-debug.html' failed with exception: Error: sanitize-boom"));
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "fetchData errorCallBack failed for template '/l31-debug.html' with exception: Error: sanitize-boom");
                expect(cb).toHaveBeenCalledWith(true);
                expect(containers.isReady('l31-debug')).toBe(false);

                const cb2 = jest.fn();
                expect(containers.tryPrepare('l31-debug', cb2)).toBe(true);
                await flushPromises();
                jest.runAllTimers();
                expect(cb2).toHaveBeenCalledWith(true);
                expect((globalThis as any).fetch).toHaveBeenCalledTimes(2);
            });
        });

        it('reports an HTTP error status with its cause, not as "nor html template … found" (L-51)', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve('')
            });

            class MyCtx implements IContext {}
            containers.add('http-err-c', MyCtx as any, [],
                '/missing-page.html', mockBinderCreator, () => undefined);

            containers.tryPrepare('http-err-c', jest.fn());
            await flushPromises();
            jest.runAllTimers();

            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                "Invalid container 'http-err-c': response does not indicate success: Error: 404 (Not Found).");
            expect(console.error).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining('nor html template'));
        });

        it('reports a network failure with its cause (L-51)', async () => {
            (globalThis as any).fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            class MyCtx implements IContext {}
            containers.add('net-err-c', MyCtx as any, [],
                '/offline.html', mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('net-err-c', cb);
            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                "Invalid container 'net-err-c': response does not indicate success: TypeError: Failed to fetch.");
        });

        it('reports a rejected provider promise with its cause (L-51)', async () => {
            class MyCtx implements IContext {}
            const provider = { get: () => Promise.reject(new Error('provider-down')) };
            containers.add('prov-reject-c', MyCtx as any, [],
                provider as any, mockBinderCreator, () => undefined);

            const cb = jest.fn();
            containers.tryPrepare('prov-reject-c', cb);
            await flushPromises();
            jest.runAllTimers();

            expect(cb).toHaveBeenCalledWith(true);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                "Invalid container 'prov-reject-c': response does not indicate success: Error: provider-down.");
        });

        describe('L-51: rejection reasons that are not Error objects', () => {
            const rejectWith = async (name: string, reason: unknown): Promise<jest.Mock> => {
                class MyCtx implements IContext {}
                const provider = { get: () => Promise.reject(reason) };
                containers.add(name, MyCtx as any, [], provider as any, mockBinderCreator, () => undefined);
                const cb = jest.fn();
                containers.tryPrepare(name, cb);
                await flushPromises();
                jest.runAllTimers();
                return cb;
            };

            it('passes a non-empty string reason through verbatim', async () => {
                const cb = await rejectWith('rej-str', 'service unavailable');
                expect(cb).toHaveBeenCalledWith(true);
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'rej-str': response does not indicate success: service unavailable.");
            });

            it('stringifies a non-Error object reason', async () => {
                const cb = await rejectWith('rej-obj', { code: 503 });
                expect(cb).toHaveBeenCalledWith(true);
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'rej-obj': response does not indicate success: [object Object].");
            });

            it('reports a rejection with no reason as a failure, not as "nor html template … found"', async () => {
                const cb = await rejectWith('rej-undef', undefined);
                expect(cb).toHaveBeenCalledWith(true);
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'rej-undef': response does not indicate success: unknown error.");
            });

            it('reports a null rejection reason as a failure, not as an empty / non-string template', async () => {
                const cb = await rejectWith('rej-null', null);
                expect(cb).toHaveBeenCalledWith(true);
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'rej-null': response does not indicate success: unknown error.");
            });

            it('reports an empty-string rejection reason as a failure, not as "nor html template … found"', async () => {
                const cb = await rejectWith('rej-empty', '');
                expect(cb).toHaveBeenCalledWith(true);
                expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `,
                    "Invalid container 'rej-empty': response does not indicate success: unknown error.");
            });
        });
    });
});
