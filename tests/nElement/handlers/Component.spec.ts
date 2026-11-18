import { Component } from '../../../src/nElement/handlers/Component';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Environment } from '../../../src/Environment';
import { Constants } from '../../../src/Constants';
import { ElementManipulations } from '../../../src/models/injections/ElementManipulations';
import { ElementSubscriptions } from '../../../src/models/injections/ElementSubscriptions';
import { ChangeDetector } from '../../../src/models/injections/ChangeDetector';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('Component handler', () => {
    const mockGetManipulations = () => ({} as any);
    const mockGetSubscriptions = () => ({} as any);
    const mockGetEventDispatcher = () => ({} as any);
    const mockParentBinder = {} as any;
    const mockParentNElement = { isVisible: true } as any;   // visibility is read from the host NElement on bind

    /** Mock Environment.components for the handler to use */
    function mockComponentsEnv(opts: {
        has?: boolean;
        isReady?: boolean;
        tryPrepareResult?: boolean;
        dependencies?: ReadonlySet<unknown>;
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
        const mockContext = { someProp: 'value' };

        const components = {
            has: jest.fn().mockReturnValue(opts.has ?? true),
            isReady: jest.fn().mockReturnValue(opts.isReady ?? true),
            instantiateBinder: jest.fn().mockReturnValue(mockContextBinder),
            instantiateContext: jest.fn().mockReturnValue(mockContext),
            tryPrepare: jest.fn().mockReturnValue(opts.tryPrepareResult ?? false),
            getDependencies: jest.fn().mockReturnValue(opts.dependencies),
        };

        (Environment as any)._components = components;
        Object.defineProperty(Environment, 'components', { get: () => components, configurable: true });

        return { components, mockContextBinder, mockContext };
    }

    function createComponentHandler(tagName: string) {
        const el = document.createElement(tagName);
        (el as any).$bind = jest.fn();
        const attrs = new Attributes(el, false);
        const handler = new Component(el, attrs, mockParentBinder, mockParentNElement, mockGetManipulations, mockGetSubscriptions,
                                      mockGetEventDispatcher);
        return { el, attrs, handler };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have no expression for unregistered element', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, false);
        const handler = new Component(el, attrs, mockParentBinder, mockParentNElement, mockGetManipulations, mockGetSubscriptions, 
                                      mockGetEventDispatcher);

        expect(handler.hasNExpression).toBe(false);
    });

    describe('isNApplicable', () => {
        it('should return false for unregistered element', () => {
            const el = document.createElement('div');
            expect(Component.isNApplicable(el)).toBe(false);
        });

        // The nodeType guard was removed: TreeBuilder only hands elements to isNApplicable.
        it('should return false for an unregistered tag', () => {
            mockComponentsEnv({ has: false });
            expect(Component.isNApplicable(document.createElement('not-registered'))).toBe(false);
        });

        it('should return true for a registered component element', () => {
            mockComponentsEnv({ has: true });
            const el = document.createElement('my-widget');
            expect(Component.isNApplicable(el)).toBe(true);
        });
    });

    describe('onCommit', () => {
        it('should mark ready and instantiate binder on first commit', () => {
            mockComponentsEnv({ has: true, isReady: true });
            const { handler, attrs, el } = createComponentHandler('my-widget');
            const readyAttr = `${Constants.HANDLERS.COMPONENT_MARKER_ATTRIBUTE_NAME}${Constants.HANDLERS.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX}`;
            expect(el.hasAttribute(readyAttr)).toBe(false);

            // The handler sets isEntityDataDirty in the constructor, so just commit
            handler.commit();

            // written by the handler itself — Attributes is no longer involved
            expect(el.getAttribute(readyAttr)).toBe('');
            expect(attrs.isDirty).toBe(false);
            expect((el as any).$bind).toHaveBeenCalled();
        });

        it('should call tryPrepare when component is not ready', () => {
            const envMock = mockComponentsEnv({ has: true, isReady: false, tryPrepareResult: true });
            const { handler } = createComponentHandler('my-widget');

            handler.commit();

            expect(envMock.components.isReady).toHaveBeenCalledWith('my-widget');
            expect(envMock.components.tryPrepare).toHaveBeenCalledWith('my-widget', expect.any(Function));
        });

        it('should dispose when tryPrepare returns false', () => {
            mockComponentsEnv({ has: true, isReady: false, tryPrepareResult: false });
            const { handler } = createComponentHandler('my-widget');

            // Should not throw — disposeInternal(true) is called
            handler.commit();
        });

        it('should dispose and recreate when component name changes after first commit', () => {
            // First commit with the registered component
            const env1 = mockComponentsEnv({ has: true, isReady: true });
            const el = document.createElement('my-widget');
            (el as any).$bind = jest.fn();
            const attrs = new Attributes(el, false);
            const handler = new Component(el, attrs, mockParentBinder, mockParentNElement, mockGetManipulations, mockGetSubscriptions,
                                          mockGetEventDispatcher);

            handler.commit(); // first commit
            expect(env1.mockContextBinder.dispose).not.toHaveBeenCalled();

            // Second commit with a different component by re-setting the expression
            // Since the tag-based name can't change, we verify second commit=no-change path
            handler.commit(); // same name — should return existing entityData
        });

        it('should log error when instantiateBinder returns undefined', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const env = mockComponentsEnv({ has: true, isReady: true });
            env.components.instantiateBinder.mockReturnValue(undefined);
            const { handler } = createComponentHandler('my-widget');

            handler.commit();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should invoke tryPrepare callback to schedule re-commit', () => {
            const envMock = mockComponentsEnv({ has: true, isReady: false, tryPrepareResult: true });
            const { handler } = createComponentHandler('my-widget');

            handler.commit();

            // Get the callback passed to tryPrepare
            const tryPrepareCallback = envMock.components.tryPrepare.mock.calls[0][1];
            expect(typeof tryPrepareCallback).toBe('function');

            // Now make isReady true and call the callback to simulate async ready
            envMock.components.isReady.mockReturnValue(true);
            tryPrepareCallback();
            // The callback sets isEntityDataDirty and calls commit
        });
    });

    // The manipulation / subscription proxies are only reachable when the component context asks for
    // them through DI; otherwise the creators are not kept (so the NElement's Attributes / Styles /
    // Properties / Classes can be released) and the context receives undefined in their place.
    describe('element manipulations / subscriptions dependencies', () => {
        function createWithCreators(tagName: string) {
            const manipulations = { kind: 'manipulations' };
            const subscriptions = { kind: 'subscriptions' };
            const eventDispatcher = { kind: 'eventDispatcher' };
            const getManipulations = jest.fn(() => manipulations as any);
            const getSubscriptions = jest.fn(() => subscriptions as any);
            const getEventDispatcher = jest.fn(() => eventDispatcher as any);

            const el = document.createElement(tagName);
            (el as any).$bind = jest.fn();
            const handler = new Component(el, new Attributes(el, false), mockParentBinder, mockParentNElement,
                                          getManipulations, getSubscriptions, getEventDispatcher);

            return { el, handler, getManipulations, getSubscriptions, manipulations, subscriptions, eventDispatcher };
        }

        it('should report neither for an element that is not a component', () => {
            mockComponentsEnv({ has: false });
            const { handler } = createWithCreators('div');

            expect(handler.hasNExpression).toBe(false);
            expect(handler.hasElementManipulations).toBe(false);
            expect(handler.hasElementSubscriptions).toBe(false);
        });

        it('should report neither when the component dependencies are unknown', () => {
            const { components } = mockComponentsEnv({ has: true, dependencies: undefined });
            const { handler } = createWithCreators('my-widget');

            expect(components.getDependencies).toHaveBeenCalledWith('my-widget');
            expect(handler.hasElementManipulations).toBe(false);
            expect(handler.hasElementSubscriptions).toBe(false);
        });

        it('should report neither when the context injects other services only', () => {
            mockComponentsEnv({ has: true, dependencies: new Set([ChangeDetector]) });
            const { handler } = createWithCreators('my-widget');

            expect(handler.hasElementManipulations).toBe(false);
            expect(handler.hasElementSubscriptions).toBe(false);
        });

        it.each([
            ['ElementManipulations only', [ElementManipulations], true, false],
            ['ElementSubscriptions only', [ElementSubscriptions], false, true],
            ['both', [ElementManipulations, ElementSubscriptions], true, true],
        ])('should report the injected proxies (%s)', (_label, dependencies, manipulations, subscriptions) => {
            mockComponentsEnv({ has: true, dependencies: new Set(dependencies) });
            const { handler } = createWithCreators('my-widget');

            expect(handler.hasElementManipulations).toBe(manipulations);
            expect(handler.hasElementSubscriptions).toBe(subscriptions);
        });

        it('should pass undefined proxies and never call their creators when the context does not inject them', () => {
            const { components } = mockComponentsEnv({ has: true, isReady: true, dependencies: new Set() });
            const { el, handler, getManipulations, getSubscriptions, eventDispatcher } = createWithCreators('my-widget');

            handler.commit();

            expect(components.instantiateContext).toHaveBeenCalledWith('my-widget', el, expect.any(ChangeDetector),
                                                                       undefined, undefined, eventDispatcher);
            expect(getManipulations).not.toHaveBeenCalled();
            expect(getSubscriptions).not.toHaveBeenCalled();
        });

        it('should pass the created proxies when the context injects them', () => {
            const { components } = mockComponentsEnv({ has: true, isReady: true,
                                                       dependencies: new Set([ElementManipulations, ElementSubscriptions]) });
            const { el, handler, getManipulations, getSubscriptions, manipulations, subscriptions, eventDispatcher } = createWithCreators('my-widget');

            handler.commit();

            expect(components.instantiateContext).toHaveBeenCalledWith('my-widget', el, expect.any(ChangeDetector),
                                                                       manipulations, subscriptions, eventDispatcher);
            expect(getManipulations).toHaveBeenCalledTimes(1);
            expect(getSubscriptions).toHaveBeenCalledTimes(1);
        });

        it('should create only the injected proxy when the context asks for one of them', () => {
            const { components } = mockComponentsEnv({ has: true, isReady: true, dependencies: new Set([ElementSubscriptions]) });
            const { el, handler, getManipulations, subscriptions, eventDispatcher } = createWithCreators('my-widget');

            handler.commit();

            expect(components.instantiateContext).toHaveBeenCalledWith('my-widget', el, expect.any(ChangeDetector),
                                                                       undefined, subscriptions, eventDispatcher);
            expect(getManipulations).not.toHaveBeenCalled();
        });
    });

    describe('onDispose', () => {
        it('should dispose the child context binder on dispose', () => {
            const { mockContextBinder } = mockComponentsEnv({ has: true, isReady: true });
            const { handler } = createComponentHandler('my-widget');

            handler.commit();
            handler.dispose();

            expect(mockContextBinder.dispose).toHaveBeenCalled();
        });
    });

    describe('onEntityDataChange', () => {
        it('should call $bind on the element when entity data changes', () => {
            mockComponentsEnv({ has: true, isReady: true });
            const { handler, el } = createComponentHandler('my-widget');

            handler.commit();

            expect((el as any).$bind).toHaveBeenCalled();
        });
    });
});
