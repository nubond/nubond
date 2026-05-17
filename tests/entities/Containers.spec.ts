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

        const binderData = containers.instantiateBinder('binder');
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
        expect(containers.instantiateBinder('nonexistent')).toBeUndefined();
    });

    it('should return undefined for unknown container instantiateContext', () => {
        expect(containers.instantiateContext('nonexistent')).toBeUndefined();
    });

    it('should apply HTML sanitizer', () => {
        class MyCtx implements IContext {}
        const sanitizer = (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, '');

        containers.add('sanitized', MyCtx as any, [],
            '<div>safe</div>', mockBinderCreator, () => sanitizer);
        expect(containers.has('sanitized')).toBe(true);
    });

    it('should log error and return undefined for instantiateBinder when template is not ready', () => {
        class MyCtx implements IContext {}

        containers.add('async-binder', MyCtx as any, [],
            'http://localhost/template.html', mockBinderCreator, () => undefined);
        expect(containers.isReady('async-binder')).toBe(false);

        const result = containers.instantiateBinder('async-binder');
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
                'http://localhost/container.html', mockBinderCreator, () => undefined);
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
                'http://localhost/missing.html', mockBinderCreator, () => undefined);

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
                'http://localhost/empty.html', mockBinderCreator, () => undefined);

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
                'http://localhost/fail.html', mockBinderCreator, () => undefined);

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

        it('should queue multiple callbacks when fetch is in progress', async () => {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div>fetched</div>')
            });

            class MyCtx implements IContext {}
            containers.add('queued-c', MyCtx as any, [],
                'http://localhost/queued.html', mockBinderCreator, () => undefined);

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
                'http://localhost/iso.html', mockBinderCreator, () => undefined);

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
                'http://localhost/template.html', mockBinderCreator, () => undefined);

            const result = containers.instantiateContext('not-ready-ctx');
            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('not ready'));
        });
    });
});
