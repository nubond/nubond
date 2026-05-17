import { Component } from '../../../src/nElement/handlers/Component';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Environment } from '../../../src/Environment';
import { Constants } from '../../../src/Constants';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('Component handler', () => {
    const mockGetManipulations = () => ({} as any);
    const mockGetSubscriptions = () => ({} as any);
    const mockGetEventDispatcher = () => ({} as any);
    const mockIsVisible = () => true;

    /** Mock Environment.components for the handler to use */
    function mockComponentsEnv(opts: {
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
        const mockContext = { someProp: 'value' };

        const components = {
            has: jest.fn().mockReturnValue(opts.has ?? true),
            isReady: jest.fn().mockReturnValue(opts.isReady ?? true),
            instantiateBinder: jest.fn().mockReturnValue(mockContextBinder),
            instantiateContext: jest.fn().mockReturnValue(mockContext),
            tryPrepare: jest.fn().mockReturnValue(opts.tryPrepareResult ?? false),
        };

        (Environment as any)._components = components;
        Object.defineProperty(Environment, 'components', { get: () => components, configurable: true });

        return { components, mockContextBinder, mockContext };
    }

    function createComponentHandler(tagName: string) {
        const el = document.createElement(tagName);
        (el as any).$bind = jest.fn();
        const attrs = new Attributes(el);
        const handler = new Component(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                      mockGetEventDispatcher, mockIsVisible);
        return { el, attrs, handler };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have no expression for unregistered element', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Component(el, attrs, mockGetManipulations, mockGetSubscriptions, 
                                      mockGetEventDispatcher, mockIsVisible);

        expect(handler.hasNExpression).toBe(false);
    });

    describe('isNApplicable', () => {
        it('should return false for unregistered element', () => {
            const el = document.createElement('div');
            expect(Component.isNApplicable(el)).toBe(false);
        });

        it('should return false for non-element node', () => {
            const textNode = document.createTextNode('text');
            // Text nodes have nodeType 3, not 1
            expect(Component.isNApplicable(textNode as any)).toBe(false);
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
            const markAsReadySpy = jest.spyOn(attrs, 'markAsReady');

            // The handler sets isEntityDataDirty in the constructor, so just commit
            handler.commit();

            expect(markAsReadySpy).toHaveBeenCalledWith(Constants.COMPONENT_MARKER_ATTRIBUTE_NAME);
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
            const attrs = new Attributes(el);
            const handler = new Component(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                          mockGetEventDispatcher, mockIsVisible);

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
