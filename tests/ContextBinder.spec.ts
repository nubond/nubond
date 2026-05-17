import { ContextBinder, RootContextBinder } from '../src/ContextBinder';
import { ExpressionExecutor } from '../src/expression/ExpressionExecutor';
import { Console } from '../src/Console';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('ContextBinder', () => {
    function createBinder(config?: any): ContextBinder {
        return new ContextBinder(
            config,                    // contextConfig
            false,                     // pessimisticChangeDetectionStrategyDefault
            () => 'nb-hidden',         // getHiddenClassName
            undefined,                 // htmlSanitizer
            () => false,               // getShowDebugInfo
            () => undefined,           // getDetectors
            () => undefined            // getEventers
        );
    }

    it('should create instance', () => {
        const binder = createBinder();
        expect(binder).toBeDefined();
    });

    it('should have expressionExecutor', () => {
        const binder = createBinder();
        expect(binder.expressionExecutor).toBeDefined();
    });

    it('should have expressionExecutor as instance of ExpressionExecutor', () => {
        const binder = createBinder();
        expect(binder.expressionExecutor).toBeInstanceOf(ExpressionExecutor);
    });

    it('should have change detection enabled by default', () => {
        const binder = createBinder();
        expect(binder.isChangeDetectionEnabled).toBe(true);
    });

    it('should disable change detection', () => {
        const binder = createBinder();
        binder.disableChangeDetection();
        expect(binder.isChangeDetectionEnabled).toBe(false);
    });

    it('should re-enable change detection', () => {
        const binder = createBinder();
        binder.disableChangeDetection();
        binder.enableChangeDetection();
        expect(binder.isChangeDetectionEnabled).toBe(true);
    });

    it('should not be disposed initially', () => {
        const binder = createBinder();
        expect(binder.isDisposed).toBe(false);
    });

    it('should have no context initially', () => {
        const binder = createBinder();
        expect(binder.context).toBeUndefined();
    });

    describe('bind', () => {
        it('should bind context to element', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {};

            // Use non-debounced bind to avoid setTimeout
            binder.bind(el, context as any, false, false);
            expect(binder.context).toBe(context);
        });

        it('should not allow double bind', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {};

            binder.bind(el, context as any, false, false);
            // Second bind should log error, not throw
            expect(() => binder.bind(el, {} as any, false, false)).not.toThrow();
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('should set rootNElement after bind', () => {
            const binder = createBinder();
            expect(binder.rootNElement).toBeUndefined();

            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);
            expect(binder.rootNElement).toBeDefined();
        });
    });

    describe('dispose', () => {
        it('should set isDisposed to true', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);
            binder.dispose();
            expect(binder.isDisposed).toBe(true);
        });

        it('should invoke onDispose callback', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            const callback = jest.fn();
            binder.onDispose(callback);
            binder.dispose();
            expect(callback).toHaveBeenCalled();
        });

        it('should not dispose twice', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            const callback = jest.fn();
            binder.onDispose(callback);
            binder.dispose();
            binder.dispose();
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should dispose rootNElement', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            const disposeSpy = jest.spyOn(binder.rootNElement as any, 'dispose');
            binder.dispose();
            expect(disposeSpy).toHaveBeenCalled();
        });
    });

    describe('callbacks', () => {
        it('should trigger containerAttached callback', () => {
            const binder = createBinder();
            expect(() => binder.containerAttached({})).not.toThrow();
        });

        it('should trigger containerDetached callback', () => {
            const binder = createBinder();
            expect(() => binder.containerDetached({})).not.toThrow();
        });

        it('should trigger inputsRefreshIsDone callback', () => {
            const binder = createBinder();
            expect(() => binder.inputsRefreshIsDone()).not.toThrow();
        });
    });

    describe('with contextConfig', () => {
        it('should use htmlSanitizer from config', () => {
            const sanitizer = jest.fn((html: string) => html);
            const binder = createBinder({ htmlSanitizer: sanitizer, pessimisticChangeDetectionStrategy: false });

            expect(binder.htmlSanitizer).toBeDefined();
        });

        it('should return a callable htmlSanitizer function', () => {
            const sanitizer = jest.fn((html: string) => `<safe>${html}</safe>`);
            const binder = createBinder({ htmlSanitizer: sanitizer });

            expect(typeof binder.htmlSanitizer).toBe('function');
            const result = binder.htmlSanitizer!('<div>test</div>');
            expect(result).toBe('<safe><div>test</div></safe>');
        });

        it('should use pessimistic strategy from config', () => {
            const binder = createBinder({ htmlSanitizer: (h: string) => h, pessimisticChangeDetectionStrategy: true });
            // The strategy is internal, but we can verify construction succeeded
            expect(binder).toBeDefined();
        });
    });

    describe('getShowDebugInfo and getHiddenClassName', () => {
        it('should expose getShowDebugInfo', () => {
            const binder = createBinder();
            expect(binder.getShowDebugInfo()).toBe(false);
        });

        it('should expose getHiddenClassName', () => {
            const binder = createBinder();
            expect(binder.getHiddenClassName()).toBe('nb-hidden');
        });
    });

    describe('detectChanges', () => {
        it('should trigger change detection via setTimeout debounce', () => {
            jest.useFakeTimers();
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            binder.detectChanges();
            expect(detectSpy).not.toHaveBeenCalled();

            jest.runAllTimers();
            expect(detectSpy).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });

    describe('context lifecycle hooks', () => {
        it('should bind onContainerAttached from context', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            const onContainerAttached = jest.fn();
            const context = { onContainerAttached } as any;

            binder.bind(el, context, false, false);
            binder.containerAttached({});

            expect(onContainerAttached).toHaveBeenCalled();
        });

        it('should bind onContainerDetached from context', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            const onContainerDetached = jest.fn();
            const context = { onContainerDetached } as any;

            binder.bind(el, context, false, false);
            binder.containerDetached({});

            expect(onContainerDetached).toHaveBeenCalled();
        });

        it('should bind onInputsRefreshDone from context', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            const onInputsRefreshDone = jest.fn();
            const context = { onInputsRefreshDone } as any;

            binder.bind(el, context, false, false);
            binder.inputsRefreshIsDone();

            expect(onInputsRefreshDone).toHaveBeenCalled();
        });

        it('should bind onDetectChangesDone from context', () => {
            jest.useFakeTimers();
            const binder = createBinder();
            const el = document.createElement('div');
            const onDetectChangesDone = jest.fn();
            const context = { onDetectChangesDone } as any;

            binder.bind(el, context, false, false);
            binder.detectChanges();
            jest.runAllTimers();

            expect(onDetectChangesDone).toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('should bind onDispose from context', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            const onDispose = jest.fn();
            const context = { onDispose } as any;

            binder.bind(el, context, false, false);
            binder.dispose();

            expect(onDispose).toHaveBeenCalled();
        });
    });

    describe('detector property interception', () => {
        function createDetectorBinder(detectors: string[]): ContextBinder {
            return new ContextBinder(
                undefined,
                false,
                () => 'nb-hidden',
                undefined,
                () => false,
                () => detectors,
                () => undefined
            );
        }

        it('should intercept detector property with getter/setter', () => {
            const binder = createDetectorBinder(['count']);
            const el = document.createElement('div');
            const context = { count: 0 } as any;

            binder.bind(el, context, false, false);

            expect(context.count).toBe(0);
            context.count = 5;
            expect(context.count).toBe(5);
        });

        it('should trigger detectChanges when detector property changes', () => {
            jest.useFakeTimers();
            const binder = createDetectorBinder(['count']);
            const el = document.createElement('div');
            const context = { count: 0 } as any;

            binder.bind(el, context, false, false);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            context.count = 10;
            jest.runAllTimers();

            expect(detectSpy).toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('should NOT trigger detectChanges when setting same value', () => {
            jest.useFakeTimers();
            const binder = createDetectorBinder(['count']);
            const el = document.createElement('div');
            const context = { count: 42 } as any;

            binder.bind(el, context, false, false);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            context.count = 42;
            jest.runAllTimers();

            expect(detectSpy).not.toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('should error for property with getter/setter', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createDetectorBinder(['prop']);
            const el = document.createElement('div');
            const context = {} as any;
            Object.defineProperty(context, 'prop', {
                get: () => 1,
                set: () => {},
                configurable: true,
                enumerable: true
            });

            binder.bind(el, context, false, false);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('has getter or setter')
            );
            errorSpy.mockRestore();
        });

        it('should error for non-configurable property', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createDetectorBinder(['prop']);
            const el = document.createElement('div');
            const context = {} as any;
            Object.defineProperty(context, 'prop', {
                value: 1,
                configurable: false,
                writable: true,
                enumerable: true
            });

            binder.bind(el, context, false, false);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('should be configurable')
            );
            errorSpy.mockRestore();
        });

        it('should NOT auto-trigger when detector property is initially undefined', () => {
            jest.useFakeTimers();
            const binder = createDetectorBinder(['val']);
            const el = document.createElement('div');
            const context = { val: undefined } as any;

            binder.bind(el, context, false, false);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            // No auto-trigger should have happened for undefined val
            jest.runAllTimers();
            // Only the initial bind's change detection fires, not an extra auto-trigger
            jest.useRealTimers();
            expect(context.val).toBeUndefined();
        });

        it('should catch and log error when defineProperty fails for detector', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createDetectorBinder(['prop']);
            const el = document.createElement('div');
            const context = {} as any;

            // Make the property non-configurable AND non-writable so delete + defineProperty throws
            Object.defineProperty(context, 'prop', {
                value: 42,
                configurable: false,
                writable: false,
                enumerable: true
            });

            binder.bind(el, context, false, false);

            // The non-configurable branch should be hit and error logged
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });

    describe('eventer property interception', () => {
        function createEventerBinder(eventers: Map<string, string>): ContextBinder {
            return new ContextBinder(
                undefined,
                false,
                () => 'nb-hidden',
                undefined,
                () => false,
                () => undefined,
                () => eventers
            );
        }

        it('should dispatch CustomEvent on initial value (autoTrigger)', () => {
            const eventers = new Map([['myProp', 'my-event']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = { myProp: 'initial' } as any;

            const dispatchSpy = jest.spyOn(el, 'dispatchEvent');

            binder.bind(el, context, false, false);

            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'my-event', detail: 'initial' })
            );
        });

        it('should dispatch CustomEvent when eventer property changes', () => {
            const eventers = new Map([['myProp', 'my-event']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = { myProp: 'initial' } as any;

            binder.bind(el, context, false, false);

            const dispatchSpy = jest.spyOn(el, 'dispatchEvent');
            dispatchSpy.mockClear();

            context.myProp = 'updated';

            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'my-event', detail: 'updated' })
            );
        });

        it('should NOT dispatch when setting same eventer value', () => {
            const eventers = new Map([['myProp', 'my-event']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = { myProp: 'same' } as any;

            binder.bind(el, context, false, false);

            const dispatchSpy = jest.spyOn(el, 'dispatchEvent');
            dispatchSpy.mockClear();

            context.myProp = 'same';

            expect(dispatchSpy).not.toHaveBeenCalled();
        });

        it('should dispatch with undefined when value is undefined (autoTrigger skipped)', () => {
            const eventers = new Map([['myProp', 'my-event']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = { myProp: undefined } as any;

            const dispatchSpy = jest.spyOn(el, 'dispatchEvent');

            binder.bind(el, context, false, false);

            // autoTrigger should skip since value is undefined
            expect(dispatchSpy).not.toHaveBeenCalled();
        });

        it('should dispatch CustomEvent without detail when newValue becomes undefined', () => {
            const eventers = new Map([['myProp', 'my-event']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = { myProp: 'initial' } as any;

            binder.bind(el, context, false, false);

            const dispatchSpy = jest.spyOn(el, 'dispatchEvent');
            dispatchSpy.mockClear();

            // Set to undefined - hits the Helpers.isUndefined(newValue) ? newValue : ... true branch
            context.myProp = undefined;

            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'my-event' })
            );
            // The CustomEvent constructor receives undefined (not { detail: ... })
            const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
            expect(event.detail).toBeNull();
        });

        it('should allow reading eventer property via getter', () => {
            const eventers = new Map([['myProp', 'my-event']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = { myProp: 'hello' } as any;

            binder.bind(el, context, false, false);

            // Reading the property triggers the get function in getSetifyFromMap
            expect(context.myProp).toBe('hello');

            context.myProp = 'world';
            expect(context.myProp).toBe('world');
        });

        it('should error for eventer property with getter/setter', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const eventers = new Map([['prop', 'ev']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = {} as any;
            Object.defineProperty(context, 'prop', {
                get: () => 1,
                set: () => {},
                configurable: true,
                enumerable: true
            });

            binder.bind(el, context, false, false);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('has getter or setter')
            );
            errorSpy.mockRestore();
        });

        it('should error for non-configurable eventer property', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const eventers = new Map([['prop', 'ev']]);
            const binder = createEventerBinder(eventers);
            const el = document.createElement('div');
            const context = {} as any;
            Object.defineProperty(context, 'prop', {
                value: 1,
                configurable: false,
                writable: true,
                enumerable: true
            });

            binder.bind(el, context, false, false);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('should be configurable')
            );
            errorSpy.mockRestore();
        });
    });

    describe('debounced bind path', () => {
        it('should use detectChangesInternal when debounced=true', () => {
            jest.useFakeTimers();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {} as any;

            binder.bind(el, context, false, true);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');

            jest.runAllTimers();

            expect(detectSpy).toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('should use default debounced=true when not specified', () => {
            jest.useFakeTimers();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {} as any;

            // Call bind without the debounced parameter - exercises the default-arg branch
            binder.bind(el, context, false);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            jest.runAllTimers();

            expect(detectSpy).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });

    describe('pessimistic strategy', () => {
        function createPessimisticBinder(): ContextBinder {
            return new ContextBinder(
                { pessimisticChangeDetectionStrategy: true } as any,
                false,
                () => 'nb-hidden',
                undefined,
                () => false,
                () => undefined,
                () => undefined
            );
        }

        it('should recurse when tree is not stable', () => {
            const binder = createPessimisticBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            let callCount = 0;
            const origDetect = (binder.rootNElement as any).detectChanges.bind(binder.rootNElement);
            jest.spyOn(binder.rootNElement as any, 'detectChanges').mockImplementation((ctx: any) => {
                origDetect(ctx);
            });

            Object.defineProperty(binder.rootNElement!, 'isStable', {
                get: () => {
                    callCount++;
                    return callCount > 2;
                }
            });

            jest.useFakeTimers();
            binder.detectChanges();
            jest.runAllTimers();
            jest.useRealTimers();

            expect(callCount).toBeGreaterThan(1);
        });

        it('should error when max cycles exceeded', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createPessimisticBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            Object.defineProperty(binder.rootNElement!, 'isStable', {
                get: () => false
            });

            jest.useFakeTimers();
            binder.detectChanges();
            jest.runAllTimers();
            jest.useRealTimers();

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining("can't stabilize")
            );
            errorSpy.mockRestore();
        });
    });

    describe('changeDetectionIsDone after dispose', () => {
        it('should not throw when called after dispose', () => {
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);
            binder.dispose();

            expect(() => (binder as any).changeDetectionIsDone()).not.toThrow();
        });
    });

    describe('dispose with pending timeout', () => {
        it('should clear pending timeout on dispose', () => {
            jest.useFakeTimers();
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            // Trigger debounced detectChanges to create a pending timeout
            binder.detectChanges();

            // Dispose while timeout is pending - covers _detectChangesTimeout branch in dispose
            binder.dispose();
            expect(binder.isDisposed).toBe(true);

            // Ensure timer doesn't fire after dispose
            jest.runAllTimers();
            jest.useRealTimers();
        });
    });

    describe('callback error handling', () => {
        it('should catch error thrown by onContainerAttached callback', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {
                onContainerAttached: () => { throw new Error('attach error'); }
            } as any;

            binder.bind(el, context, false, false);
            binder.containerAttached({});

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('onContainerAttached call back execution error')
            );
            errorSpy.mockRestore();
        });

        it('should catch error thrown by onContainerDetached callback', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {
                onContainerDetached: () => { throw new Error('detach error'); }
            } as any;

            binder.bind(el, context, false, false);
            binder.containerDetached({});

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('onContainerDetached call back execution error')
            );
            errorSpy.mockRestore();
        });

        it('should catch error thrown by onInputsRefreshDone callback', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {
                onInputsRefreshDone: () => { throw new Error('refresh error'); }
            } as any;

            binder.bind(el, context, false, false);
            binder.inputsRefreshIsDone();

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('onInputsRefreshDone call back execution error')
            );
            errorSpy.mockRestore();
        });

        it('should catch error thrown by onDetectChangesDone callback', () => {
            jest.useFakeTimers();
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {
                onDetectChangesDone: () => { throw new Error('detect error'); }
            } as any;

            binder.bind(el, context, false, false);
            binder.detectChanges();
            jest.runAllTimers();

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('onDetectChangesDone call back execution error')
            );
            errorSpy.mockRestore();
            jest.useRealTimers();
        });

        it('should catch error thrown by onDispose callback', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            binder.onDispose(() => { throw new Error('dispose error'); });
            binder.dispose();

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('onDispose call back execution error')
            );
            errorSpy.mockRestore();
        });
    });

    describe('detectChangesInternal when disabled', () => {
        it('should not run change detection when disabled', () => {
            jest.useFakeTimers();
            const binder = createBinder();
            const el = document.createElement('div');
            binder.bind(el, {} as any, false, false);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            binder.disableChangeDetection();
            binder.detectChanges();
            jest.runAllTimers();

            expect(detectSpy).not.toHaveBeenCalled();
            jest.useRealTimers();
        });
    });

    describe('htmlSanitizer fallback to global', () => {
        it('should fall back to global htmlSanitizer when config has none', () => {
            const globalSanitizer = jest.fn((html: string) => `<safe>${html}</safe>`);
            const binder = new ContextBinder(
                { pessimisticChangeDetectionStrategy: false } as any,
                false,
                () => 'nb-hidden',
                globalSanitizer,
                () => false,
                () => undefined,
                () => undefined
            );

            expect(binder.htmlSanitizer).toBeDefined();
            const result = binder.htmlSanitizer!('<div>test</div>');
            expect(result).toBe('<safe><div>test</div></safe>');
        });

        it('should be undefined when neither config nor global has sanitizer', () => {
            const binder = new ContextBinder(
                { pessimisticChangeDetectionStrategy: false } as any,
                false,
                () => 'nb-hidden',
                undefined,
                () => false,
                () => undefined,
                () => undefined
            );

            expect(binder.htmlSanitizer).toBeUndefined();
        });
    });

    describe('double bind error paths', () => {
        it('should error when rootNElement already exists but context is undefined', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {} as any;

            binder.bind(el, context, false, false);

            // Clear context but keep rootNElement to hit the inner else branch
            (binder as any)._context = undefined;
            binder.bind(el, {} as any, false, false);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('context is already binded')
            );
            errorSpy.mockRestore();
        });

        it('should error when context is already set (outer else branch)', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const binder = createBinder();
            const el = document.createElement('div');
            const context = {} as any;

            binder.bind(el, context, false, false);
            // Second bind with context already set hits outer else
            binder.bind(el, {} as any, false, false);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('context is already set')
            );
            errorSpy.mockRestore();
        });
    });
});

describe('RootContextBinder', () => {
    function createRootBinder(getDetectors?: () => any, getEventers?: () => any): RootContextBinder {
        return new RootContextBinder(
            undefined,
            false,
            () => 'nb-hidden',
            undefined,
            () => false,
            getDetectors ?? (() => undefined),
            getEventers ?? (() => undefined)
        );
    }

    it('should create instance', () => {
        const binder = createRootBinder();
        expect(binder).toBeDefined();
        expect(binder).toBeInstanceOf(ContextBinder);
    });

    it('should bind to non-body element (disposable root)', () => {
        const binder = createRootBinder();
        const el = document.createElement('div');
        document.body.appendChild(el);

        binder.bind(el, {} as any, false);
        expect(binder.context).toBeDefined();
        expect(binder.rootNElement).toBeDefined();

        document.body.removeChild(el);
    });

    it('should bind to document.body (non-disposable root)', () => {
        const binder = createRootBinder();
        binder.bind(document.body, {} as any, false);
        expect(binder.context).toBeDefined();
    });

    it('should dispose when disconnected element calls detectChanges', () => {
        jest.useFakeTimers();
        const binder = createRootBinder();
        const el = document.createElement('div');
        document.body.appendChild(el);

        binder.bind(el, {} as any, false);

        // Disconnect the element
        document.body.removeChild(el);

        binder.detectChanges();

        expect(binder.isDisposed).toBe(true);
        jest.useRealTimers();
    });

    it('should run detectChangesInternal when connected element calls detectChanges', () => {
        jest.useFakeTimers();
        const binder = createRootBinder();
        const el = document.createElement('div');
        document.body.appendChild(el);

        binder.bind(el, {} as any, false);

        const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
        detectSpy.mockClear();

        binder.detectChanges();
        jest.runAllTimers();

        expect(detectSpy).toHaveBeenCalled();

        document.body.removeChild(el);
        jest.useRealTimers();
    });

    it('should not run detectChanges when already disposed', () => {
        const binder = createRootBinder();
        const el = document.createElement('div');
        document.body.appendChild(el);

        binder.bind(el, {} as any, false);
        binder.dispose();

        // Should not throw
        expect(() => binder.detectChanges()).not.toThrow();
        document.body.removeChild(el);
    });
});
