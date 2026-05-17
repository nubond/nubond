import { Container } from '../../../src/nElement/handlers/Container';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Environment } from '../../../src/Environment';
import { Constants } from '../../../src/Constants';
import { Helpers } from '../../../src/Helpers';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('Container handler', () => {
    function createElementWithAttr(expression?: string): Element {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.CONTAINER_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    function createHandler(expression?: string) {
        const el = createElementWithAttr(expression);
        const attrs = new Attributes(el);
        const handler = new Container(el, attrs, mockGetEventDispatcher, mockIsVisible,
                                      mockRequestParentsDetect, mockContainerAttached, mockContainerDetached);
        return { el, attrs, handler };
    }

    /** Build a mock Environment.containers that the handler calls during onCommit */
    function mockContainersEnv(opts: {
        has?: boolean;
        isReady?: boolean;
        tryPrepareResult?: boolean;
    } = {}) {
        const mockContextBinder = {
            bind: jest.fn(),
            dispose: jest.fn(),
            context: {},
            detectChanges: jest.fn(),
            inputsRefreshIsDone: jest.fn(),
            enableChangeDetection: jest.fn(),
            disableChangeDetection: jest.fn(),
        };
        const mockTemplate = document.createElement('template');
        mockTemplate.innerHTML = '<span></span>';
        const contextBinderData = {
            contextBinder: mockContextBinder,
            template: mockTemplate.content.cloneNode(true),
        };
        const mockContext = { someProp: 'value' };

        const containers = {
            has: jest.fn().mockReturnValue(opts.has ?? true),
            isReady: jest.fn().mockReturnValue(opts.isReady ?? true),
            instantiateBinder: jest.fn().mockReturnValue(contextBinderData),
            instantiateContext: jest.fn().mockReturnValue(mockContext),
            tryPrepare: jest.fn().mockReturnValue(opts.tryPrepareResult ?? false),
        };

        (Environment as any)._containers = containers;
        Object.defineProperty(Environment, 'containers', { get: () => containers, configurable: true });

        return { containers, mockContextBinder, contextBinderData, mockContext };
    }

    const mockGetEventDispatcher = () => ({} as any);
    const mockIsVisible = () => true;
    const mockRequestParentsDetect = jest.fn();
    const mockContainerAttached = jest.fn();
    const mockContainerDetached = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect expression from attribute', () => {
        const el = createElementWithAttr('@myContainer');
        const attrs = new Attributes(el);

        // Register a container first
        class MockContainer {}
        Environment.addContainer('myContainer', MockContainer as any, [], '<div></div>', undefined);

        const handler = new Container(el, attrs, mockGetEventDispatcher, mockIsVisible,
                                      mockRequestParentsDetect, mockContainerAttached, mockContainerDetached);

        expect(handler.hasNExpression).toBe(true);
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Container(el, attrs, mockGetEventDispatcher, mockIsVisible,
                                      mockRequestParentsDetect, mockContainerAttached, mockContainerDetached);

        expect(handler.hasNExpression).toBe(false);
    });

    describe('onBind', () => {
        it('should evaluate expression and call setContextData with stringified result', () => {
            const { handler } = createHandler('this.containerName');

            const executeExpression = jest.fn().mockReturnValue('mycontainer');
            handler.bind(undefined, executeExpression);

            expect(executeExpression).toHaveBeenCalled();
            // After bind, handler should be dirty (setContextData sets isEntityDataDirty)
            expect(handler.isDirty).toBe(true);
        });

        it('should not call executeExpression when no expression', () => {
            const { handler } = createHandler();

            const executeExpression = jest.fn();
            handler.bind(undefined, executeExpression);

            expect(executeExpression).not.toHaveBeenCalled();
        });

        it('should pass through executionParams', () => {
            const { handler } = createHandler('this.name');
            const params = { context: { name: 'test' } } as any;

            const executeExpression = jest.fn().mockReturnValue('test');
            const result = handler.bind(params, executeExpression);

            expect(result).toBe(params);
        });
    });

    describe('onCommit', () => {
        it('should call markAsReady on first commit', () => {
            const { handler, attrs } = createHandler('this.name');
            const markAsReadySpy = jest.spyOn(attrs, 'markAsReady');

            mockContainersEnv({ has: true, isReady: true });

            // bind to set the container name
            const executeExpression = jest.fn().mockReturnValue('mycontainer');
            handler.bind(undefined, executeExpression);

            // commit
            handler.commit();

            expect(markAsReadySpy).toHaveBeenCalledWith(Constants.CONTAINER_HANDLER_ATTRIBUTE_NAME);
        });

        it('should instantiate binder and context on first commit with ready container', () => {
            const { handler } = createHandler('this.name');
            const { containers } = mockContainersEnv({ has: true, isReady: true });

            const executeExpression = jest.fn().mockReturnValue('mycontainer');
            handler.bind(undefined, executeExpression);
            handler.commit();

            expect(containers.has).toHaveBeenCalledWith('mycontainer');
            expect(containers.isReady).toHaveBeenCalledWith('mycontainer');
            expect(containers.instantiateBinder).toHaveBeenCalledWith('mycontainer');
            expect(containers.instantiateContext).toHaveBeenCalled();
        });

        it('should dispose and recreate when container name changes', () => {
            const { handler } = createHandler('this.name');
            const envMock = mockContainersEnv({ has: true, isReady: true });

            // First bind+commit
            const exec1 = jest.fn().mockReturnValue('containerA');
            handler.bind(undefined, exec1);
            handler.commit();

            expect(envMock.containers.instantiateBinder).toHaveBeenCalledTimes(1);

            // Second bind+commit with different name
            const exec2 = jest.fn().mockReturnValue('containerB');
            handler.bind(undefined, exec2);
            handler.commit();

            expect(envMock.containers.instantiateBinder).toHaveBeenCalledTimes(2);
        });

        it('should not recreate when container name stays the same', () => {
            const { handler } = createHandler('this.name');
            const envMock = mockContainersEnv({ has: true, isReady: true });

            const exec = jest.fn().mockReturnValue('mycontainer');
            handler.bind(undefined, exec);
            handler.commit();

            // Re-bind with same name
            handler.bind(undefined, exec);
            handler.commit();

            // instantiateBinder should only be called once
            expect(envMock.containers.instantiateBinder).toHaveBeenCalledTimes(1);
        });

        it('should clean up when container name becomes empty', () => {
            const { handler, el } = createHandler('this.name');
            mockContainersEnv({ has: true, isReady: true });

            // First: bind with a valid name
            const exec1 = jest.fn().mockReturnValue('mycontainer');
            handler.bind(undefined, exec1);
            handler.commit();

            // Now bind with empty name
            const exec2 = jest.fn().mockReturnValue('');
            handler.bind(undefined, exec2);
            handler.commit();

            // Element's children should have been cleaned up (via _nElementProjection.cleanUp)
            // No error should be thrown
        });

        it('should call tryPrepare when container is not ready', () => {
            const { handler } = createHandler('this.name');
            const envMock = mockContainersEnv({ has: true, isReady: false, tryPrepareResult: true });

            const exec = jest.fn().mockReturnValue('asynccontainer');
            handler.bind(undefined, exec);
            handler.commit();

            expect(envMock.containers.tryPrepare).toHaveBeenCalledWith('asynccontainer', expect.any(Function));
        });

        it('should clean up when container is not found (has returns false)', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const { handler } = createHandler('this.name');
            mockContainersEnv({ has: false });

            const exec = jest.fn().mockReturnValue('unknown');
            handler.bind(undefined, exec);

            // Should not throw
            handler.commit();
            consoleSpy.mockRestore();
        });

        it('should log a not-found error when container name is unregistered', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const { handler, el } = createHandler('this.name');
            mockContainersEnv({ has: false });

            const exec = jest.fn().mockReturnValue('missing-container');
            handler.bind(undefined, exec);
            handler.commit();

            expect(consoleSpy).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                el,
                expect.stringContaining("Container with name 'missing-container' not found"),
            );
            consoleSpy.mockRestore();
        });

        it('should log error when instantiateBinder returns undefined', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const { handler } = createHandler('this.name');
            const envMock = mockContainersEnv({ has: true, isReady: true });
            envMock.containers.instantiateBinder.mockReturnValue(undefined);

            const exec = jest.fn().mockReturnValue('mycontainer');
            handler.bind(undefined, exec);
            handler.commit();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should clean up when tryPrepare returns false', () => {
            const { handler } = createHandler('this.name');
            mockContainersEnv({ has: true, isReady: false, tryPrepareResult: false });

            const exec = jest.fn().mockReturnValue('asynccontainer');
            handler.bind(undefined, exec);
            handler.commit();

            // Should not throw — disposeInternal(true) + cleanUp called
        });

        it('should invoke tryPrepare callback to schedule re-commit', () => {
            const { handler } = createHandler('this.name');
            const envMock = mockContainersEnv({ has: true, isReady: false, tryPrepareResult: true });

            const exec = jest.fn().mockReturnValue('asynccontainer');
            handler.bind(undefined, exec);
            handler.commit();

            // Get the callback passed to tryPrepare
            const tryPrepareCallback = envMock.containers.tryPrepare.mock.calls[0][1];
            expect(typeof tryPrepareCallback).toBe('function');

            // Now make it ready and invoke callback
            envMock.containers.isReady.mockReturnValue(true);
            envMock.containers.has.mockReturnValue(true);
            tryPrepareCallback();
        });
    });

    describe('onDispose', () => {
        it('should dispose the child context binder on dispose', () => {
            const { handler } = createHandler('this.name');
            const { mockContextBinder } = mockContainersEnv({ has: true, isReady: true });

            const exec = jest.fn().mockReturnValue('mycontainer');
            handler.bind(undefined, exec);
            handler.commit();

            handler.dispose();

            expect(mockContextBinder.dispose).toHaveBeenCalled();
        });

        it('should not throw when disposing without any context', () => {
            const { handler } = createHandler('this.name');

            // No bind/commit, just dispose
            expect(() => handler.dispose()).not.toThrow();
        });
    });

    describe('setContextData', () => {
        it('should lower-case the context name and mark dirty', () => {
            const { handler } = createHandler('this.name');
            const envMock = mockContainersEnv({ has: true, isReady: true });

            const exec = jest.fn().mockReturnValue('MyContainer');
            handler.bind(undefined, exec);
            handler.commit();

            // has() should have been called with lower-cased name
            expect(envMock.containers.has).toHaveBeenCalledWith('mycontainer');
        });
    });

    describe('route-based container (% prefix)', () => {
        it('should detect route-based expression with % prefix', () => {
            // Route containers need Environment.router to be configured
            const mockRouter = {
                isConfigured: true,
                state: { myslot: 'somecontainer' },
                onAfterStateChange: jest.fn().mockReturnValue(() => {}),
            };
            (Environment as any)._router = mockRouter;
            Object.defineProperty(Environment, 'router', { get: () => mockRouter, configurable: true });

            mockContainersEnv({ has: true, isReady: true });

            const { handler } = createHandler('%mySlot');

            expect(handler.hasNExpression).toBe(true);
            // The expression should have been converted to @mySlot (@ is constant-bind, wraps in double quotes)
            expect(handler.nExpression!.nExpression.expression).toBe('"mySlot"');
        });

        it('should log error when route is not configured', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const mockRouter = {
                isConfigured: false,
                state: null,
                onAfterStateChange: jest.fn().mockReturnValue(() => {}),
            };
            (Environment as any)._router = mockRouter;
            Object.defineProperty(Environment, 'router', { get: () => mockRouter, configurable: true });

            const { handler } = createHandler('%mySlot');

            expect(handler.hasNExpression).toBe(true);
            // Router onAfterStateChange should NOT have been subscribed
            expect(mockRouter.onAfterStateChange).not.toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('should call onAfterStateChange callback and update context from route state', () => {
            const stateChangeCallbacks: Array<() => void> = [];
            const mockRouter = {
                isConfigured: true,
                state: { mySlot: 'containerA' } as any,
                onAfterStateChange: jest.fn().mockImplementation((cb: () => void) => {
                    stateChangeCallbacks.push(cb);
                    return () => {};
                }),
            };
            (Environment as any)._router = mockRouter;
            Object.defineProperty(Environment, 'router', { get: () => mockRouter, configurable: true });

            const envMock = mockContainersEnv({ has: true, isReady: true });
            const { handler } = createHandler('%mySlot');

            // First commit based on initial state
            handler.commit();
            expect(envMock.containers.has).toHaveBeenCalledWith('containera');

            // Now simulate route change
            mockRouter.state = { mySlot: 'containerB' };
            stateChangeCallbacks[0]();

            expect(mockRequestParentsDetect).toHaveBeenCalled();
        });

        it('should handle null router state by setting empty context name', () => {
            const mockRouter = {
                isConfigured: true,
                state: null as any,
                onAfterStateChange: jest.fn().mockReturnValue(() => {}),
            };
            (Environment as any)._router = mockRouter;
            Object.defineProperty(Environment, 'router', { get: () => mockRouter, configurable: true });

            mockContainersEnv({ has: true, isReady: true });
            const { handler } = createHandler('%mySlot');

            // Should not throw even with null state — results in empty context
            handler.commit();
        });

        it('should unsubscribe from route on dispose', () => {
            const unsubFn = jest.fn();
            const mockRouter = {
                isConfigured: true,
                state: { myslot: 'somecontainer' },
                onAfterStateChange: jest.fn().mockReturnValue(unsubFn),
            };
            (Environment as any)._router = mockRouter;
            Object.defineProperty(Environment, 'router', { get: () => mockRouter, configurable: true });

            mockContainersEnv({ has: true, isReady: true });
            const { handler } = createHandler('%mySlot');

            handler.commit();
            handler.dispose();

            expect(unsubFn).toHaveBeenCalled();
        });
    });
});
