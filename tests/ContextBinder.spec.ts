import { ContextBinder, RootContextBinder } from '../src/ContextBinder';
import { ExpressionExecutor } from '../src/expression/ExpressionExecutor';
import { Console } from '../src/Console';
import { Constants } from '../src/Constants';
import { Environment } from '../src/Environment';
import { Container } from '../src/nElement/handlers/Container';

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
        expect(binder.changeDetectionEnabled).toBe(true);
    });

    it('should disable change detection', () => {
        const binder = createBinder();
        binder.disableChangeDetection();
        expect(binder.changeDetectionEnabled).toBe(false);
    });

    it('should re-enable change detection', () => {
        const binder = createBinder();
        binder.disableChangeDetection();
        binder.enableChangeDetection();
        expect(binder.changeDetectionEnabled).toBe(true);
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

        // R9-2: a fresh Invalid Date deep-equals the previous Invalid Date, so re-assigning one is not a change
        it('should NOT trigger detectChanges when assigning a fresh Invalid Date over an Invalid Date (R9-2)', () => {
            jest.useFakeTimers();
            try {
                const binder = createDetectorBinder(['when']);
                const el = document.createElement('div');
                const context = { when: new Date('invalid') } as any;

                binder.bind(el, context, false, false);

                const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
                detectSpy.mockClear();

                context.when = new Date('still invalid');
                jest.runAllTimers();
                expect(detectSpy).not.toHaveBeenCalled();

                context.when = new Date(0);
                jest.runAllTimers();
                expect(detectSpy).toHaveBeenCalledTimes(1);
            } finally {
                jest.useRealTimers();
            }
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

        //R6-8 (by-design): decorators are supported only at the top level — on the context class itself,
        //on plain configurable own properties. Class accessors live on the prototype, where the own-property
        //guard deliberately does not look, so they are shadowed instead of rejected. Characterization test —
        //do not "fix" it by walking the prototype chain.
        it('should shadow a class accessor without an error (prototype accessors are not supported)', () => {
            const errorSpy = jest.spyOn(Console, 'error').mockImplementation();
            const setterCalls: Array<number> = [];

            class AccessorContext {
                private _count = 1;

                public get count(): number {
                    return this._count;
                }
                public set count(newValue: number) {
                    setterCalls.push(newValue);
                    this._count = newValue;
                }
            }

            const binder = createDetectorBinder(['count']);
            const el = document.createElement('div');
            const context = new AccessorContext() as any;

            binder.bind(el, context, false, false);

            expect(errorSpy).not.toHaveBeenCalled();

            context.count = 42;

            //the instance-level interceptor shadows the class accessor: its setter never runs again
            expect(setterCalls).toEqual([]);
            expect(context.count).toBe(42);
            expect(Object.getPrototypeOf(context).constructor).toBe(AccessorContext);

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

        describe('R8-2: the auto-trigger announces the initial value only while it is still current', () => {
            // A debounced bind (a component with inputs) leaves a window before the first cycle in
            // which an assignment - typically nb-in delivery from the parent - dispatches through the
            // setter. The auto-trigger fires on the first onDetectChangesDone, after that dispatch, and
            // is skipped when the value no longer equals the initial one.
            function dispatchedDuringFirstCycle(initial: any, beforeFirstCycle: (context: any) => void): any[] {
                jest.useFakeTimers();
                try {
                    const binder = createEventerBinder(new Map([['myProp', 'my-event']]));
                    const el = document.createElement('div');
                    const details: any[] = [];
                    el.addEventListener('my-event', event => details.push((event as CustomEvent).detail));

                    const context = { myProp: initial } as any;
                    binder.bind(el, context, false, true);
                    beforeFirstCycle(context);
                    jest.runAllTimers();

                    return details;
                } finally {
                    jest.useRealTimers();
                }
            }

            it('should end with the value assigned before the first cycle, not the stale initial value', () => {
                const details = dispatchedDuringFirstCycle('init', context => context.myProp = 'fromParent');

                expect(details[details.length - 1]).toBe('fromParent');
                expect(details).not.toContain('init');
            });

            it('should end with "no detail" when the value was cleared before the first cycle', () => {
                const details = dispatchedDuringFirstCycle('init', context => context.myProp = undefined);

                expect(details[details.length - 1]).toBeNull();
                expect(details).not.toContain('init');
            });

            it('should dispatch the initial value exactly once when nothing changed before the first cycle', () => {
                expect(dispatchedDuringFirstCycle('init', () => {})).toEqual(['init']);
            });

            it('should not auto-trigger when the initial value was undefined', () => {
                expect(dispatchedDuringFirstCycle(undefined, context => context.myProp = 'v')).toEqual(['v']);
            });

            it('should dispatch a value changed before the first cycle exactly once', () => {
                expect(dispatchedDuringFirstCycle('init', context => context.myProp = 'fromParent'))
                    .toEqual(['fromParent']);
            });

            it('should dispatch a value cleared before the first cycle exactly once', () => {
                expect(dispatchedDuringFirstCycle('init', context => context.myProp = undefined))
                    .toEqual([null]);
            });

            it('should announce an initial object that was mutated in place with its current contents', () => {
                expect(dispatchedDuringFirstCycle({ a: 1 }, context => context.myProp.a = 2))
                    .toEqual([{ a: 2 }]);
            });

            it.each([
                ['NaN', NaN],
                ['an Invalid Date', new Date('invalid')],
                ['a Set of objects', new Set([{ a: 1 }])],
                ['zero', 0],
                ['false', false]
            ])('should announce an untouched initial value that is %s', (_, initial) => {
                const details = dispatchedDuringFirstCycle(initial, () => {});

                expect(details).toHaveLength(1);
                expect(details[0]).toBe(initial);
            });

            // known residual: the value went away and came back before the first cycle - the setter
            // dispatched both changes, and the auto-trigger sees "equals initial" and announces it again
            it('should announce the initial value again after a change-and-revert (known residual)', () => {
                expect(dispatchedDuringFirstCycle('init', context => { context.myProp = 'x'; context.myProp = 'init'; }))
                    .toEqual(['x', 'init', 'init']);
            });

            // known residual: a deep-equal replacement does not dispatch through the setter, and the
            // auto-trigger dispatches the captured initial reference, not the object the property now holds
            it('should dispatch the initial reference after a deep-equal replacement (known residual)', () => {
                const initial = { a: 1 };
                const replacement = { a: 1 };
                const details = dispatchedDuringFirstCycle(initial, context => context.myProp = replacement);

                expect(details).toHaveLength(1);
                expect(details[0]).toBe(initial);
                expect(details[0]).not.toBe(replacement);
            });
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

        it('should fall back to global htmlSanitizer when contextConfig is undefined', () => {
            const globalSanitizer = jest.fn((html: string) => `<safe>${html}</safe>`);
            const binder = new ContextBinder(
                undefined,
                false,
                () => 'nb-hidden',
                globalSanitizer,
                () => false,
                () => undefined,
                () => undefined
            );

            expect(binder.htmlSanitizer).toBeDefined();
            expect(binder.htmlSanitizer!('<div>test</div>')).toBe('<safe><div>test</div></safe>');
        });

        it('should fall back to global htmlSanitizer in a root binder with no contextConfig', () => {
            const globalSanitizer = jest.fn((html: string) => `<safe>${html}</safe>`);
            const binder = new RootContextBinder(
                undefined,
                false,
                () => 'nb-hidden',
                globalSanitizer,
                () => false,
                () => undefined,
                () => undefined
            );

            expect(binder.htmlSanitizer).toBeDefined();
            expect(binder.htmlSanitizer!('<div>test</div>')).toBe('<safe><div>test</div></safe>');
        });

        it('should sanitize nb-html through the global sanitizer when contextConfig is undefined', () => {
            const globalSanitizer = jest.fn((html: string) => html.replace(/<img[^>]*>/g, ''));
            const binder = new ContextBinder(
                undefined,
                false,
                () => 'nb-hidden',
                globalSanitizer,
                () => false,
                () => undefined,
                () => undefined
            );

            const root = document.createElement('div');
            const target = document.createElement('span');
            target.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.HTML_HANDLER_ATTRIBUTE_NAME}`,
                                'this.html');
            root.appendChild(target);

            binder.bind(root, { html: '<b>hi</b><img src="x" onerror="alert(1)">' } as any, false, false);

            expect(globalSanitizer).toHaveBeenCalled();
            expect(target.innerHTML).toBe('<b>hi</b>');
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

    // Whole-tree counterpart of the 1.3 tests in tests/nElement/handlers/Events.spec.ts: an nb-event
    // handler reads the scope of the latest cycle, so it sees the objects that are in the data now.
    describe('1.3: nb-event handlers run with the scope of the latest cycle', () => {
        function bindTree(html: string, context: any): { binder: ContextBinder; root: Element } {
            const root = document.createElement('div');
            root.innerHTML = html;

            const binder = createBinder();
            binder.bind(root, context, true, false);

            return { binder, root };
        }

        function createListContext(): any {
            return {
                items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }],
                removed: [] as Array<number>,
                remove(item: any): void {
                    const index = this.items.indexOf(item);

                    this.removed.push(index);
                    if (index >= 0) {
                        this.items.splice(index, 1);
                    }
                }
            };
        }

        const LIST = '<ul><li nb-repeat="this.items" nb-event:click="this.remove(item)" nb-value="item.name"></li></ul>';

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        // bugs.md L-25: after the rows were replaced by deep-equal copies the handler kept the old
        // objects, so indexOf() returned -1 and nothing was removed.
        it('should remove the clicked row after the items were replaced by deep-equal copies (L-25)', () => {
            const context = createListContext();
            const { binder, root } = bindTree(LIST, context);

            context.items = context.items.map((item: any) => ({ ...item }));
            binder.detectChanges();
            jest.runAllTimers();

            (root.querySelectorAll('li')[1] as HTMLElement).click();
            jest.runAllTimers();

            expect(context.removed).toEqual([1]);
            expect(context.items.map((item: any) => item.id)).toEqual([1, 3]);
            expect(Array.from(root.querySelectorAll('li')).map(element => element.textContent)).toEqual(['a', 'c']);
        });

        it('should hand a row the item it currently shows after the list was reordered', () => {
            const context = createListContext();
            const { binder, root } = bindTree(LIST, context);

            context.items.reverse();
            binder.detectChanges();
            jest.runAllTimers();

            // the first row now shows 'c'
            (root.querySelectorAll('li')[0] as HTMLElement).click();
            jest.runAllTimers();

            expect(context.items.map((item: any) => item.id)).toEqual([2, 1]);
            expect(Array.from(root.querySelectorAll('li')).map(element => element.textContent)).toEqual(['b', 'a']);
        });
    });

    describe('R2-5: single-bind nb-repeat and the enclosing scope', () => {
        // Whole-tree counterpart of the unit tests in tests/nElement/handlers/Repeat.spec.ts.
        // Only the repeatIndex 0 handler takes the single-bind skip path, so the pre-fix
        // defect produced a TORN row set: row 0 stale, the cloned rows fresh. A
        // handler-level test cannot see that, because the clones are separate instances.
        function renderOf(root: Element): string {
            return Array.from(root.querySelectorAll('[data-out]'))
                        .map(element => element.textContent)
                        .join(' | ');
        }

        function bindTree(html: string, context: any): { binder: ContextBinder; root: Element } {
            const root = document.createElement('div');
            root.innerHTML = html;

            const binder = createBinder();
            binder.bind(root, context, true, false);

            return { binder, root };
        }

        function nextCycle(binder: ContextBinder): void {
            binder.detectChanges();
            jest.runAllTimers();
        }

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should refresh an outer nb-var in every row of a single-bind repeat', () => {
            const context: any = { label: 'first', rows: ['x', 'y'] };
            const { binder, root } = bindTree(
                '<section nb-var:label="this.label">' +
                '<span nb-repeat="#this.rows" data-out nb-value="label + \':\' + item"></span>' +
                '</section>', context);

            expect(renderOf(root)).toBe('first:x | first:y');

            context.label = 'second';
            nextCycle(binder);

            // pre-fix: 'first:x | second:y' - row 0 kept the first cycle's scope
            expect(renderOf(root)).toBe('second:x | second:y');
        });

        it('should refresh the outer repeat item in every row of a single-bind repeat', () => {
            const context: any = { groups: ['G1', 'G2'], rows: ['x', 'y'] };
            const { binder, root } = bindTree(
                '<section nb-repeat:g="this.groups">' +
                '<span nb-repeat="#this.rows" data-out nb-value="gItem + \'-\' + gIndex + \'/\' + item"></span>' +
                '</section>', context);

            expect(renderOf(root)).toBe('G1-0/x | G1-0/y | G2-1/x | G2-1/y');

            context.groups = ['A1', 'A2'];
            nextCycle(binder);

            // pre-fix: 'G1-0/x | A1-0/y | G2-1/x | A2-1/y'
            expect(renderOf(root)).toBe('A1-0/x | A1-0/y | A2-1/x | A2-1/y');
        });

        it('should refresh the outer scope inside a child of a single-bind repeat', () => {
            const context: any = { label: 'first', rows: ['x', 'y'] };
            const { binder, root } = bindTree(
                '<section nb-var:label="this.label">' +
                '<span nb-repeat="#this.rows"><b data-out nb-value="label + \':\' + item"></b></span>' +
                '</section>', context);

            expect(renderOf(root)).toBe('first:x | first:y');

            context.label = 'second';
            nextCycle(binder);

            expect(renderOf(root)).toBe('second:x | second:y');
        });

        it('should still freeze the data source of a single-bind repeat', () => {
            const context: any = { rows: ['x', 'y'] };
            const { binder, root } = bindTree(
                '<span nb-repeat="#this.rows" data-out nb-value="item + \'|\' + index + \'|\' + count"></span>',
                context);

            expect(renderOf(root)).toBe('x|0|2 | y|1|2');

            context.rows = ['p', 'q', 'r'];
            nextCycle(binder);

            expect(renderOf(root)).toBe('x|0|2 | y|1|2');
        });

        it('should refresh the outer scope for object and number data sources', () => {
            const context: any = { label: 'L1', obj: { a: 1, b: 2 } };
            const { binder, root } = bindTree(
                '<section nb-var:label="this.label">' +
                '<span nb-repeat="#this.obj" data-out nb-value="label + \':\' + item"></span>' +
                '<i nb-repeat="#3" data-out nb-value="label + \'#\' + item"></i>' +
                '</section>', context);

            expect(renderOf(root)).toBe('L1:1 | L1:2 | L1#1 | L1#2 | L1#3');

            context.label = 'L2';
            nextCycle(binder);

            // pre-fix: 'L1:1 | L2:2 | L1#1 | L2#2 | L2#3'
            expect(renderOf(root)).toBe('L2:1 | L2:2 | L2#1 | L2#2 | L2#3');
        });

        it('should refresh the outer scope through nested single-bind repeats', () => {
            const context: any = { label: 'L1', groups: ['G1', 'G2'], rows: ['x', 'y'] };
            const { binder, root } = bindTree(
                '<section nb-var:label="this.label">' +
                '<div nb-repeat:g="#this.groups">' +
                '<span nb-repeat="#this.rows" data-out nb-value="label + \':\' + gItem + \'/\' + item"></span>' +
                '</div></section>', context);

            expect(renderOf(root)).toBe('L1:G1/x | L1:G1/y | L1:G2/x | L1:G2/y');

            context.label = 'L2';
            nextCycle(binder);
            expect(renderOf(root)).toBe('L2:G1/x | L2:G1/y | L2:G2/x | L2:G2/y');

            // both repeats stay frozen on their own data
            context.groups = ['Z1', 'Z2'];
            nextCycle(binder);
            expect(renderOf(root)).toBe('L2:G1/x | L2:G1/y | L2:G2/x | L2:G2/y');
        });

        it('should keep clone removal working when the outer repeat shrinks', () => {
            const context: any = { groups: ['G1', 'G2', 'G3'], rows: ['x', 'y'] };
            const { binder, root } = bindTree(
                '<section nb-repeat:g="this.groups">' +
                '<span nb-repeat="#this.rows" data-out nb-value="gItem + \'/\' + item"></span>' +
                '</section>', context);

            expect(renderOf(root)).toBe('G1/x | G1/y | G2/x | G2/y | G3/x | G3/y');

            context.groups = ['A1'];
            nextCycle(binder);

            expect(renderOf(root)).toBe('A1/x | A1/y');
        });
    });

    describe('R3-2: change detection requested while disabled must not be lost', () => {
        // A container/component inside a false nb-if/nb-case/nb-switch has its binder's
        // change detection disabled (ContextedBase.commit). Requests that arrived while
        // hidden used to be discarded outright - no flag, no queue - so when the branch
        // became visible again enableChangeDetection() restored the flag but nothing ran,
        // and the stale DOM was shown until an unrelated future trigger happened to fire.
        // The binder now remembers that a cycle is owed and runs it on re-enable.
        function bindTree(html: string, context: any): { binder: ContextBinder; root: Element } {
            const root = document.createElement('div');
            root.innerHTML = html;

            const binder = createBinder();
            binder.bind(root, context, true, false);

            return { binder, root };
        }

        function outputOf(root: Element): string | null {
            return root.querySelector('[data-out]')!.textContent;
        }

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should flush a request that arrived while change detection was disabled', () => {
            const context: any = { text: 'v1' };
            const { binder, root } = bindTree('<span data-out nb-value="this.text"></span>', context);

            expect(outputOf(root)).toBe('v1');

            binder.disableChangeDetection();
            context.text = 'v2';
            binder.detectChanges();
            jest.runAllTimers();

            // a disabled binder still must not touch the DOM
            expect(outputOf(root)).toBe('v1');

            binder.enableChangeDetection();
            jest.runAllTimers();

            expect(outputOf(root)).toBe('v2');
        });

        it('should not run a cycle when re-enabled with nothing pending', () => {
            const context: any = { text: 'v1' };
            const { binder } = bindTree('<span data-out nb-value="this.text"></span>', context);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            binder.disableChangeDetection();
            binder.enableChangeDetection();
            jest.runAllTimers();

            expect(detectSpy).not.toHaveBeenCalled();
        });

        it('should coalesce every request dropped while disabled into one cycle', () => {
            const context: any = { text: 'v1' };
            const { binder } = bindTree('<span data-out nb-value="this.text"></span>', context);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            binder.disableChangeDetection();
            binder.detectChanges();
            binder.detectChanges();
            binder.detectChanges();
            jest.runAllTimers();

            expect(detectSpy).not.toHaveBeenCalled();

            binder.enableChangeDetection();
            jest.runAllTimers();

            expect(detectSpy).toHaveBeenCalledTimes(1);
        });

        it('should consume the pending request so a later re-enable stays quiet', () => {
            const context: any = { text: 'v1' };
            const { binder } = bindTree('<span data-out nb-value="this.text"></span>', context);

            const detectSpy = jest.spyOn(binder.rootNElement as any, 'detectChanges');
            detectSpy.mockClear();

            binder.disableChangeDetection();
            binder.detectChanges();
            binder.enableChangeDetection();
            jest.runAllTimers();

            expect(detectSpy).toHaveBeenCalledTimes(1);

            // the owed cycle has been paid - hiding and reshowing again asks for nothing
            binder.disableChangeDetection();
            binder.enableChangeDetection();
            jest.runAllTimers();

            expect(detectSpy).toHaveBeenCalledTimes(1);
        });

        it('should not flush a pending request after the binder was disposed', () => {
            const context: any = { text: 'v1' };
            const { binder } = bindTree('<span data-out nb-value="this.text"></span>', context);

            const rootNElement = binder.rootNElement as any;
            const detectSpy = jest.spyOn(rootNElement, 'detectChanges');
            detectSpy.mockClear();

            binder.disableChangeDetection();
            binder.detectChanges();
            binder.dispose();

            expect(() => binder.enableChangeDetection()).not.toThrow();
            jest.runAllTimers();

            expect(detectSpy).not.toHaveBeenCalled();
        });
    });

    describe('R3-2: a hidden container catches up when it becomes visible again', () => {
        // Whole-tree counterpart: nb-if hides the host element, ContextedBase.commit
        // disables the child container's binder, the child context asks for a cycle
        // (ChangeDetector.detect(), a @Detector write, a resolved promise) and the
        // request is owed until nb-if turns true again.
        function nextCycle(binder: ContextBinder): void {
            binder.detectChanges();
            jest.runAllTimers();
        }

        function buildHostWithHiddenChild(containerName: string): { binder: ContextBinder; host: any; childContext: any; childBinder: any; root: Element } {
            let childContext: any;

            class ChildContext {
                public text = 'v1';
                constructor() {
                    childContext = this;
                }
            }

            Environment.addContainer(containerName, ChildContext as any, [],
                                     '<span data-out nb-value="this.text"></span>', undefined);

            const host: any = { show: true };
            const root = document.createElement('div');
            root.innerHTML = '<div nb-if="this.show" nb-container="@' + containerName + '"></div>';
            document.body.appendChild(root);

            const binder = createBinder();
            binder.bind(root, host, true, false);
            jest.runAllTimers();

            const childBinder = (binder.rootNElement as any)._children[0]._disposeSequence.find((handler: any) => handler instanceof Container).contextBinder;

            return { binder, host, childContext, childBinder, root };
        }

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should render the update that was requested while the branch was hidden', () => {
            const { binder, host, childContext, childBinder, root } = buildHostWithHiddenChild('R32Child');

            expect(root.querySelector('[data-out]')!.textContent).toBe('v1');
            expect(childBinder.changeDetectionEnabled).toBe(true);

            host.show = false;
            nextCycle(binder);

            expect(childBinder.changeDetectionEnabled).toBe(false);

            // the child keeps living while hidden - a timer, a promise or an injected
            // ChangeDetector.detect() all land on its own binder
            childContext.text = 'v2';
            childBinder.detectChanges();
            jest.runAllTimers();

            expect(root.querySelector('[data-out]')!.textContent).toBe('v1');

            host.show = true;
            nextCycle(binder);

            expect(childBinder.changeDetectionEnabled).toBe(true);
            expect(root.querySelector('[data-out]')!.textContent).toBe('v2');

            root.remove();
        });

        it('should leave a hidden mutation that never asked for a cycle alone', () => {
            // boundary of the fix: only dropped REQUESTS are replayed. A silent write with
            // no trigger behind it is the ordinary optimistic contract, hidden or not.
            const { binder, host, childContext, childBinder, root } = buildHostWithHiddenChild('R32QuietChild');

            host.show = false;
            nextCycle(binder);

            childContext.text = 'v2';
            jest.runAllTimers();

            host.show = true;
            nextCycle(binder);

            expect(childBinder.changeDetectionEnabled).toBe(true);
            expect(root.querySelector('[data-out]')!.textContent).toBe('v1');

            root.remove();
        });
    });

    describe('R6-4: an empty container name settles instead of churning every cycle', () => {
        // nb-container="this.view" with view '' / undefined is the normal "no view selected"
        // state. Container.setContextData marks the handler dirty on every bind, so the
        // empty branch itself has to recognise "already cleaned up" - otherwise the fallback
        // is re-cloned every cycle and, in pessimistic mode, the tree never stabilizes.
        let passesSpy: jest.SpyInstance;
        let errorSpy: jest.SpyInstance;

        function createPessimisticBinder(): ContextBinder {
            return new ContextBinder(undefined, true, () => 'nb-hidden', undefined,
                                     () => false, () => undefined, () => undefined);
        }

        function build(view: any, pessimistic: boolean): { binder: ContextBinder; host: any; root: Element } {
            const host: any = { view };
            const root = document.createElement('div');
            root.innerHTML = '<div nb-container="this.view"><b data-fallback>fallback</b></div>';
            document.body.appendChild(root);

            const binder = pessimistic ? createPessimisticBinder() : createBinder();
            binder.bind(root, host, true, false);
            jest.runAllTimers();

            return { binder, host, root };
        }

        // returns the number of tree passes the trigger produced
        function trigger(binder: ContextBinder): number {
            passesSpy.mockClear();
            binder.detectChanges();
            jest.runAllTimers();
            return passesSpy.mock.calls.length;
        }

        function stabilizeErrors(): number {
            return errorSpy.mock.calls.filter(call => String(call[0]).includes("can't stabilize")).length;
        }

        function notFoundErrors(): number {
            return errorSpy.mock.calls.filter(call => call.some((arg: any) => String(arg).includes('not found'))).length;
        }

        beforeEach(() => {
            jest.useFakeTimers();
            passesSpy = jest.spyOn(ContextBinder.prototype as any, 'processChangeDetection');
            errorSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            passesSpy.mockRestore();
            errorSpy.mockRestore();
            jest.useRealTimers();
        });

        it.each([[''], [undefined]])('pessimistic: a steady empty name (%p) takes one pass per trigger', (view) => {
            const { binder, root } = build(view, true);

            expect(trigger(binder)).toBe(1);
            expect(trigger(binder)).toBe(1);
            expect(stabilizeErrors()).toBe(0);

            root.remove();
        });

        it.each([[true], [false]])('pessimistic=%p: the fallback element is not re-cloned while the name stays empty', (pessimistic) => {
            const { binder, root } = build('', pessimistic);
            const fallback = root.querySelector('[data-fallback]');

            trigger(binder);
            trigger(binder);

            expect(fallback).not.toBeNull();
            expect(root.querySelector('[data-fallback]')).toBe(fallback);

            root.remove();
        });

        it('pessimistic: name -> empty disposes the child, restores the fallback once, then settles', () => {
            let disposeCount = 0;
            Environment.addContainer('R64Child', class { onDispose() { disposeCount++; } } as any, [],
                                     '<span data-child>child</span>', undefined);

            const { binder, host, root } = build('R64Child', true);
            expect(root.querySelector('[data-child]')).not.toBeNull();

            host.view = '';
            trigger(binder);

            expect(disposeCount).toBe(1);
            expect(root.querySelector('[data-child]')).toBeNull();
            const fallback = root.querySelector('[data-fallback]');
            expect(fallback).not.toBeNull();

            expect(trigger(binder)).toBe(1);
            expect(root.querySelector('[data-fallback]')).toBe(fallback);
            expect(stabilizeErrors()).toBe(0);

            root.remove();
        });

        it('pessimistic: empty -> name -> empty round trip re-renders and re-settles', () => {
            Environment.addContainer('R64RoundTrip', class { } as any, [],
                                     '<span data-child>child</span>', undefined);

            const { binder, host, root } = build(undefined, true);

            host.view = 'R64RoundTrip';
            trigger(binder);
            expect(root.querySelector('[data-child]')).not.toBeNull();
            expect(root.querySelector('[data-fallback]')).toBeNull();

            host.view = undefined;
            trigger(binder);
            expect(root.querySelector('[data-child]')).toBeNull();
            expect(root.querySelector('[data-fallback]')).not.toBeNull();

            expect(trigger(binder)).toBe(1);
            expect(stabilizeErrors()).toBe(0);

            root.remove();
        });

        it('pessimistic: an unregistered name no longer spins the stabilization loop (still logs once per cycle)', () => {
            // characterization: the not-found branch resets the stored names, so the next bind
            // retries the lookup - one "not found" per cycle - but it reports no change, so
            // pessimistic mode no longer re-runs it up to the 10-cycle cap
            const { binder, root } = build('R64NotRegistered', true);
            errorSpy.mockClear();

            expect(trigger(binder)).toBe(1);
            expect(notFoundErrors()).toBe(1);
            expect(stabilizeErrors()).toBe(0);

            root.remove();
        });
    });

    describe('R10-1: a detector written from inside a pass cannot re-trigger detection endlessly', () => {
        // nb-exec="this.counter = this.counter + 1" on a @Detector() used to schedule a fresh pass from
        // every pass, forever and silently. A detector write made during a pass is now counted per property
        // across consecutive passes; past the cap the detector stops scheduling passes, logs once and
        // stays disabled. The cap is counted in change detection cycles and its bookkeeping lags (a pass is
        // confirmed only when the following one completes, from a count captured at write time), so the
        // effective limit is 2 * MAX + 1 passes - 21 with MAX = 10 - not the 10 the message names. Accepted
        // as is by the author (2026-10-09).
        const MAX_PASSES = 21;
        const STEP_LIMIT = 500;

        let errorSpy: jest.SpyInstance;

        function attr(name: string): string {
            return `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${name}`;
        }

        function build(context: any, detectors: string[], execs: string[], values: string[] = [], pessimistic = false): { binder: ContextBinder; root: Element; passes: () => number } {
            const binder = new ContextBinder(undefined, pessimistic, () => 'nb-hidden', undefined,
                                             () => false, () => detectors, () => undefined);
            const root = document.createElement('div');

            for (const exec of execs) {
                const el = document.createElement('div');
                el.setAttribute(attr(Constants.EXEC_HANDLER_ATTRIBUTE_NAME), exec);
                root.appendChild(el);
            }

            for (const value of values) {
                const el = document.createElement('span');
                el.setAttribute(attr(Constants.VALUE_HANDLER_ATTRIBUTE_NAME), value);
                root.appendChild(el);
            }

            document.body.appendChild(root);

            let passes = 0;
            context.onDetectChangesDone = () => { passes++; };

            binder.bind(root, context, false, false);

            return { binder, root, passes: () => passes };
        }

        // runs scheduled passes one at a time until none is left; a regression to the endless loop
        // fails the step-limit assertion instead of hanging the suite
        function drain(): void {
            let steps = 0;
            while ((jest.getTimerCount() > 0) && (steps < STEP_LIMIT)) {
                jest.runOnlyPendingTimers();
                steps++;
            }

            expect(steps).toBeLessThan(STEP_LIMIT);
        }

        function disabledErrors(propertyName: string): number {
            return errorSpy.mock.calls.filter(call => String(call[1]).startsWith(`${propertyName} property value can't stabilize`)).length;
        }

        beforeEach(() => {
            jest.useFakeTimers();
            errorSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            errorSpy.mockRestore();
            jest.useRealTimers();
        });

        it.each([[false], [true]])('pessimistic=%p: a self-incrementing detector stops after the cap and logs once', (pessimistic) => {
            const context: any = { counter: 0 };
            const { binder, root, passes } = build(context, ['counter'], ['this.counter = this.counter + 1'], [], pessimistic);

            drain();

            expect(passes()).toBe(MAX_PASSES);
            expect(context.counter).toBe(MAX_PASSES);
            expect(jest.getTimerCount()).toBe(0);
            expect(disabledErrors('counter')).toBe(1);
            expect(errorSpy).toHaveBeenCalledWith(context, "counter property value can't stabilize in 10 change detection cycles, detector is disabled.");

            binder.dispose();
            root.remove();
        });

        it('pessimistic: an unstable tree (sub-cycle re-runs write the detector again) still stops and logs once', () => {
            const context: any = { counter: 0 };
            const { binder, root, passes } = build(context, ['counter'], ['this.counter = this.counter + 1'], ['this.counter'], true);

            drain();

            expect(passes()).toBe(MAX_PASSES);
            expect(disabledErrors('counter')).toBe(1);
            expect(root.querySelector('span')!.textContent).toBe(String(context.counter));

            binder.dispose();
            root.remove();
        });

        it('several looping detectors are counted independently and trip together', () => {
            const context: any = { a: 0, b: 0, c: 0 };
            const { binder, root, passes } = build(context, ['a', 'b', 'c'], ['this.a = this.a + 1', 'this.b = this.b + 1', 'this.c = this.c + 1']);

            drain();

            expect(passes()).toBe(MAX_PASSES);
            expect(disabledErrors('a')).toBe(1);
            expect(disabledErrors('b')).toBe(1);
            expect(disabledErrors('c')).toBe(1);

            binder.dispose();
            root.remove();
        });

        it('a detector that changes only every other pass is not disabled next to a looping one', () => {
            const context: any = { counter: 0, label: 0 };
            const { binder, root } = build(context, ['label', 'counter'], ['this.label = Math.floor(this.counter / 2)', 'this.counter = this.counter + 1']);

            drain();

            expect(disabledErrors('label')).toBe(0);
            expect(disabledErrors('counter')).toBeGreaterThan(0);

            binder.dispose();
            root.remove();
        });

        it('a self-write that converges below the cap settles without an error', () => {
            const context: any = { counter: 0 };
            const { binder, root, passes } = build(context, ['counter'], ['this.counter = Math.min(this.counter + 1, 5)']);

            drain();

            expect(context.counter).toBe(5);
            expect(passes()).toBe(6);
            expect(disabledErrors('counter')).toBe(0);

            binder.dispose();
            root.remove();
        });

        it('derived state recomputed on every external trigger never trips (a quiet pass resets the count)', () => {
            const context: any = { counter: 0, items: [1, 2, 3] };
            const { binder, root, passes } = build(context, ['counter'], ['this.counter = this.items.length']);
            drain();

            for (let i = 0; i < 3 * MAX_PASSES; i++) {
                context.items.push(i);
                binder.detectChanges();
                drain();
            }

            expect(context.counter).toBe(3 + 3 * MAX_PASSES);
            // each trigger: the pass that writes plus the self-triggered pass that finds nothing changed
            expect(passes()).toBe(2 + 2 * 3 * MAX_PASSES);
            expect(disabledErrors('counter')).toBe(0);

            binder.dispose();
            root.remove();
        });

        it('a tripped detector stays disabled: its writes are stored but no longer schedule a pass', () => {
            const context: any = { counter: 0 };
            const { binder, root } = build(context, ['counter'], ['this.counter = this.counter + 1'], ['this.counter']);
            drain();

            context.counter = 1000;

            expect(context.counter).toBe(1000);
            expect(jest.getTimerCount()).toBe(0);
            expect(root.querySelector('span')!.textContent).toBe(String(MAX_PASSES));

            // an explicit trigger still renders it
            binder.detectChanges();
            jest.runOnlyPendingTimers();

            expect(root.querySelector('span')!.textContent).toBe('1001');
            expect(jest.getTimerCount()).toBe(0);

            binder.dispose();
            root.remove();
        });

        it('dispose mid-loop stops further passes without an error', () => {
            const context: any = { counter: 0 };
            const { binder, root, passes } = build(context, ['counter'], ['this.counter = this.counter + 1']);

            jest.runOnlyPendingTimers();
            jest.runOnlyPendingTimers();
            const passesAtDispose = passes();

            binder.dispose();
            drain();

            expect(passes()).toBe(passesAtDispose);
            expect(errorSpy).not.toHaveBeenCalled();

            root.remove();
        });

        // Residual (open): the update queued by the previous pass fires after the trip and overwrites the
        // MAX * MAX "already reported" marker, so the next write from a later pass logs the error a second
        // time before the marker sticks.
        it('residual: a tripped detector can log the error a second time, then stays quiet', () => {
            const context: any = { counter: 0 };
            const { binder, root } = build(context, ['counter'], ['this.counter = this.counter + 1']);
            drain();
            expect(disabledErrors('counter')).toBe(1);

            for (let i = 0; i < 5; i++) {
                binder.detectChanges();
                drain();
            }

            expect(disabledErrors('counter')).toBe(2);

            binder.dispose();
            root.remove();
        });

        // Residual (open): an external trigger that lands before the self-scheduled pass is debounced into
        // it, so user-driven changes arriving faster than detection settles look exactly like a
        // self-sustaining loop - the derived detector is disabled although it would settle on its own.
        it('residual: external triggers merged into self-scheduled passes trip the guard', () => {
            const context: any = { counter: 0, items: [1, 2, 3] };
            const { binder, root } = build(context, ['counter'], ['this.counter = this.items.length']);
            drain();

            let tripsAt = -1;
            for (let i = 0; (i < 3 * MAX_PASSES) && (tripsAt < 0); i++) {
                context.items.push(i);
                binder.detectChanges();          // merges with the pass the previous write scheduled
                jest.runOnlyPendingTimers();     // exactly one pass per trigger, never a quiet one

                if (disabledErrors('counter') > 0) {
                    tripsAt = i + 1;
                }
            }

            expect(tripsAt).toBeGreaterThan(0);
            expect(tripsAt).toBeLessThanOrEqual(MAX_PASSES);

            binder.dispose();
            drain();
            root.remove();
        });
    });

    describe('2.1-2.3: expression pipeline - transformers and scope names in a live tree', () => {
        // Whole-tree counterpart of the unit tests in tests/expression/ExpressionExecutor.spec.ts.
        // Transformers are the parameters of an outer compiled function and the scope names
        // (nb-var / nb-repeat) those of an inner one, so a scope name shadows a transformer of the
        // same name instead of being a duplicate formal parameter (bugs.md R7-6).
        let errorSpy: jest.SpyInstance;
        let registered: number;

        // Every ExpressionExecutor (one per binder) subscribes to Environment.transformers.onAdded
        // to drop its compiled functions when the transformer set grows.
        function subscriptionCount(): number {
            const callBacks = (Environment.transformers as any)._onAddedCallBackEvent._callBacks;
            return Array.isArray(callBacks) ? callBacks.length : callBacks.size;
        }

        function renderOf(root: Element): string {
            return Array.from(root.querySelectorAll('[data-out]'))
                        .map(element => element.textContent)
                        .join(' | ');
        }

        function bindTree(html: string, context: any): { binder: ContextBinder; root: Element } {
            const root = document.createElement('div');
            root.innerHTML = html;

            const binder = createBinder();
            binder.bind(root, context, true, false);

            return { binder, root };
        }

        function nextCycle(binder: ContextBinder): void {
            binder.detectChanges();
            jest.runAllTimers();
        }

        // Registers through the public API (so onAdded is raised and the live executors drop their
        // compiled functions); afterEach takes the entries out of the Environment singleton again.
        function registerLate(name: string, transform: (...args: Array<any>) => any): void {
            class LateTransformer { transform(...args: Array<any>) { return transform(...args); } }

            Environment.addTransformer(name, LateTransformer as any, []);
            registered++;
        }

        beforeEach(() => {
            jest.useFakeTimers();
            errorSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});
            registered = 0;
        });

        afterEach(() => {
            const transformers = Environment.transformers as any;
            for (let i = 0; i < registered; i++) {
                transformers._namesSet.delete((transformers._names.pop() as string).toLowerCase());
                transformers._functions.pop();
            }

            errorSpy.mockRestore();
            jest.useRealTimers();
        });

        it('should keep an nb-var scope alive when a transformer with the same name is registered later (R7-6)', () => {
            const context: any = { label: 'first' };
            const { binder, root } = bindTree(
                '<section nb-var:late-label="this.label">' +
                '<span data-out nb-value="lateLabel"></span>' +
                '</section>', context);

            expect(renderOf(root)).toBe('first');

            registerLate('lateLabel', () => 'transformer');
            context.label = 'second';
            nextCycle(binder);

            // pre-fix: 'first' forever, plus a compilation SyntaxError (duplicate parameter) per cycle
            expect(renderOf(root)).toBe('second');
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should keep an nb-repeat:prefix scope alive when a transformer named like its item is registered later (R7-6)', () => {
            const context: any = { rows: ['x', 'y'] };
            const { binder, root } = bindTree(
                '<span nb-repeat:late="this.rows" data-out nb-value="lateItem + lateIndex"></span>', context);

            expect(renderOf(root)).toBe('x0 | y1');

            registerLate('lateItem', () => 'transformer');
            context.rows = ['z'];
            nextCycle(binder);

            expect(renderOf(root)).toBe('z0');
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should pick up a transformer registered after the tree was bound', () => {
            const context: any = { value: 'abc' };
            const { binder, root } = bindTree(
                '<span data-out nb-value="typeof lateUpper === \'function\' ? lateUpper(this.value) : \'none\'"></span>', context);

            expect(renderOf(root)).toBe('none');

            registerLate('lateUpper', (value: string) => value.toUpperCase());
            nextCycle(binder);

            expect(renderOf(root)).toBe('ABC');
            expect(errorSpy).not.toHaveBeenCalled();
        });

        // The compiled-function cache key identifies a scope by its names. Two scopes of ONE binder
        // that hold different name lists must not share a compiled function, or the positional
        // values of one are read through the parameter list of the other.
        it('should not mix up two scopes whose names concatenate to the same text', () => {
            const { root } = bindTree(
                '<section nb-var:a="1" nb-var:b="2" nb-var:ab="3">' +
                '<span data-out nb-value="ab"></span>' +
                '</section>' +
                '<section nb-var:ab="10" nb-var:a="20" nb-var:b="30">' +
                '<span data-out nb-value="ab"></span>' +
                '</section>', {});

            expect(renderOf(root)).toBe('3 | 10');
        });

        describe('the executor subscription on the transformer registry', () => {
            it('should take one subscription per binder and release it on dispose, bound or not', () => {
                const before = subscriptionCount();

                const neverBound = createBinder();
                const { binder } = bindTree('<span nb-value="this.value"></span>', { value: 1 });
                expect(subscriptionCount()).toBe(before + 2);

                neverBound.dispose();
                binder.dispose();
                expect(subscriptionCount()).toBe(before);

                // a second dispose is a no-op
                binder.dispose();
                expect(subscriptionCount()).toBe(before);
            });

            it('should release the subscriptions of nested containers when they are swapped and when the host is disposed', () => {
                Environment.addContainer('pipelineSwapA', class { } as any, [], '<span data-out>a</span>', undefined);
                Environment.addContainer('pipelineSwapB', class { } as any, [], '<span data-out>b</span>', undefined);

                const before = subscriptionCount();
                const context = { name: 'pipelineSwapA' };
                const { binder, root } = bindTree('<div nb-container="this.name"></div>', context);
                jest.runAllTimers();

                for (let i = 0; i < 6; i++) {
                    context.name = i % 2 === 0 ? 'pipelineSwapB' : 'pipelineSwapA';
                    nextCycle(binder);
                }

                expect(renderOf(root)).toBe('a');
                expect(subscriptionCount()).toBe(before + 2);        // host + the one live container

                binder.dispose();
                jest.runAllTimers();
                expect(subscriptionCount()).toBe(before);
            });

            // The binder of a container / component / app is created BEFORE its context
            // (instantiateBinder, then instantiateContext). When the context constructor throws the
            // binder used to be abandoned without dispose(), leaving its subscription - and its
            // executor - in the Environment singleton for the life of the page, one more on every
            // attempt. The three creation sites now dispose the binder on failure.
            describe('a context constructor that throws leaves no subscription behind', () => {
                let attempts: number;
                let ready: boolean;

                class Throwing { constructor() { attempts++; if (!ready) { throw new Error('boom'); } } }

                function reported(text: string): boolean {
                    return errorSpy.mock.calls.some(call => call.some((part: any) => String(part).includes(text)));
                }

                beforeAll(() => {
                    Environment.addContainer('pipelineThrowing', Throwing as any, [], '<span data-out>built</span>', undefined);
                    Environment.addComponent('pipeline-throwing', Throwing as any, [], undefined as any, '<span>built</span>',
                                             undefined, undefined, undefined);
                });

                beforeEach(() => {
                    attempts = 0;
                    ready = false;
                });

                it('container (expression-driven name, so the creation is attempted again on every pass)', () => {
                    const before = subscriptionCount();
                    const { binder, root } = bindTree('<div nb-container="this.name"></div>', { name: 'pipelineThrowing' });
                    jest.runAllTimers();

                    for (let cycle = 1; cycle <= 3; cycle++) {
                        nextCycle(binder);
                        expect(subscriptionCount()).toBe(before + 1);        // the host only
                    }
                    expect(attempts).toBe(4);

                    // the same container is built as soon as its constructor stops throwing
                    ready = true;
                    nextCycle(binder);
                    expect(renderOf(root)).toBe('built');
                    expect(subscriptionCount()).toBe(before + 2);

                    binder.dispose();
                    jest.runAllTimers();
                    expect(subscriptionCount()).toBe(before);
                });

                it('component', () => {
                    const before = subscriptionCount();
                    const { binder } = bindTree('<pipeline-throwing></pipeline-throwing><pipeline-throwing></pipeline-throwing>', {});
                    jest.runAllTimers();

                    for (let cycle = 1; cycle <= 3; cycle++) {
                        nextCycle(binder);
                        expect(subscriptionCount()).toBe(before + 1);        // the host only
                    }
                    expect(attempts).toBeGreaterThanOrEqual(2);

                    binder.dispose();
                    jest.runAllTimers();
                    expect(subscriptionCount()).toBe(before);
                });

                it('application root, and the same class can be bound once its constructor works (bugs.md L-41)', () => {
                    const before = subscriptionCount();
                    const root = document.createElement('div');
                    root.innerHTML = '<span data-out nb-value="1 + 1"></span>';
                    document.body.appendChild(root);

                    // its own class: an injectable can be registered only once, and Throwing already
                    // is (container + component above)
                    class ThrowingRoot { constructor() { attempts++; if (!ready) { throw new Error('boom'); } } }

                    try { Environment.addApp(root, ThrowingRoot as any, []); } catch { /* reported either way, see below */ }
                    jest.runAllTimers();
                    expect(subscriptionCount()).toBe(before);

                    ready = true;
                    errorSpy.mockClear();
                    Environment.addApp(root, ThrowingRoot as any, []);
                    jest.runAllTimers();

                    expect(errorSpy).not.toHaveBeenCalled();
                    expect(renderOf(root)).toBe('2');
                    expect(subscriptionCount()).toBe(before + 1);

                    (Environment as any)._elementsToContextsMapping.get(root).dispose();
                    jest.runAllTimers();
                    expect(subscriptionCount()).toBe(before);
                    root.remove();
                });

                // The failure must stay visible to the developer. Before the binder was disposed on
                // failure the exception escaped: a container / component logged
                // "handler ... commit error: Error: boom" on every pass (NElement's commit catch) and
                // addApp threw to its caller.
                describe('the failure is reported', () => {
                    it('container', () => {
                        const { binder } = bindTree('<div nb-container="@pipelineThrowing"></div>', {});
                        jest.runAllTimers();

                        expect(attempts).toBe(1);
                        expect(reported('boom')).toBe(true);

                        binder.dispose();
                        jest.runAllTimers();
                    });

                    it('component', () => {
                        const { binder } = bindTree('<pipeline-throwing></pipeline-throwing>', {});
                        jest.runAllTimers();

                        expect(attempts).toBe(1);
                        expect(reported('boom')).toBe(true);

                        binder.dispose();
                        jest.runAllTimers();
                    });

                    it('application root (logged or thrown)', () => {
                        const root = document.createElement('div');
                        document.body.appendChild(root);

                        class ThrowingRoot { constructor() { throw new Error('boom'); } }

                        let thrown: unknown;
                        try { Environment.addApp(root, ThrowingRoot as any, []); } catch (ex) { thrown = ex; }
                        jest.runAllTimers();

                        expect((thrown !== undefined) || reported('boom')).toBe(true);
                        root.remove();
                    });
                });
            });
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
