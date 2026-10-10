import { Events } from '../../../src/nElement/handlers/Events';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';
import { Environment } from '../../../src/Environment';
import { ExecutionParams } from '../../../src/expression/ExpressionExecParamsHelper';

// Mock ElementManipulations
jest.mock('../../../src/models/injections/ElementManipulations', () => ({
    ElementManipulations: jest.fn().mockImplementation(() => ({})),
    ElementPropertiesManipulations: jest.fn(),
    ElementAttributesManipulations: jest.fn(),
    ElementStylesManipulations: jest.fn(),
    ElementClassesManipulations: jest.fn(),
}));

describe('Events handler', () => {
    function createElementWithEvents(events: Record<string, string>): Element {
        const el = document.createElement('div');
        for (const [name, expression] of Object.entries(events)) {
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}${name}`,
                expression
            );
        }
        return el;
    }

    function getExecutionParam(executionParams: any, name: string): any {
        return executionParams.values[executionParams.names.indexOf(name)];
    }

    const mockGetManipulations = () => ({} as any);
    const mockDetectChanges = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect event bindings', () => {
        const el = createElementWithEvents({ 'click': 'ctx.onClick($event)' });
        const attrs = new Attributes(el, () => false);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
        expect(handler.nExpression!.has('click')).toBe(true);
    });

    it('should have no expression when no event attributes', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, () => false);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should support multiple events', () => {
        const el = createElementWithEvents({
            'click': 'ctx.onClick()',
            'mouseover': 'ctx.onHover()'
        });
        const attrs = new Attributes(el, () => false);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.nExpression!.size).toBe(2);
    });

    it('isDirty should always be false', () => {
        const el = createElementWithEvents({ 'click': 'ctx.onClick()' });
        const attrs = new Attributes(el, () => false);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.isDirty).toBe(false);
    });

    describe('subscribe/unsubscribe', () => {
        it('should subscribe to a DOM event', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);

            expect(typeof unsub).toBe('function');

            el.dispatchEvent(new Event('click'));
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should invoke callback when event fires', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            handler.subscribe('click', callback);

            el.dispatchEvent(new Event('click'));
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should register independent listeners for every subscriber of the same event', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            handler.subscribe('click', cb1);
            handler.subscribe('click', cb2);

            el.dispatchEvent(new Event('click'));
            // Both subscribers are live — no one-slot-per-event-name rule (R2-2)
            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });

        it('should unsubscribe from event', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);
            unsub();

            // Listener was removed, so the callback should NOT fire
            el.dispatchEvent(new Event('click'));
            expect(callback).not.toHaveBeenCalled();
        });

        it('should hand every subscriber its own unsubscribe (R2-2)', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            const unsub1 = handler.subscribe('click', cb1);
            handler.subscribe('click', cb2);

            unsub1();

            el.dispatchEvent(new Event('click'));
            // Only the first subscriber's listener is gone; the second is untouched
            expect(cb1).not.toHaveBeenCalled();
            expect(cb2).toHaveBeenCalledTimes(1);
        });

        it('should not let a manual subscription block the nb-event template subscription (R2-2)', () => {
            // An aspect subscribing in its constructor runs before the first Events.bind()
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const aspectCallback = jest.fn();
            handler.subscribe('click', aspectCallback);

            const exec = jest.fn().mockReturnValue(undefined);
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            expect(aspectCallback).toHaveBeenCalledTimes(1);
            expect(exec).toHaveBeenCalledTimes(1);
        });

        it('should keep manual subscriptions out of the template subscription map (R2-2)', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            handler.subscribe('click', jest.fn());

            expect(handler['_subscribed'].size).toBe(0);
            expect(handler['_unsubscribed'].size).toBe(0);
        });
    });

    describe('bind', () => {
        it('should set up event subscriptions on first bind', () => {
            const el = createElementWithEvents({ 'click': 'ctx.onClick($event)' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            handler.bind(undefined, () => undefined);
            expect(handler['_subscribed'].has('click')).toBe(true);
        });
    });

    describe('debounce', () => {
        it('should detect debounce from attribute name', () => {
            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}input${Constants.META_VALUE_SEPARATOR}300`,
                'ctx.onInput($event)'
            );
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression!.has('input')).toBe(true);
        });
    });

    describe('constructor error paths', () => {
        it('should log error when event name is empty after prefix', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const el = document.createElement('div');
            // nb-event: with no event name after the prefix separator
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}`,
                'ctx.onClick()'
            );
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            // Should not register any event bindings since the event name is empty
            expect(handler.hasNExpression).toBe(true); // attribute prefix matched
            expect(handler.nExpression!.size).toBe(0); // but no valid event registered
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });

    describe('event name parsing', () => {
        it('should parse correct event name for a single-event handler', () => {
            const el = createElementWithEvents({ 'focus': 'ctx.onFocus()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            expect(handler.nExpression!.has('focus')).toBe(true);
            expect(handler.nExpression!.size).toBe(1);
        });
    });

    describe('bind subscription', () => {
        it('should call subscribe on ElementSubscriptions when not yet subscribed', () => {
            const el = createElementWithEvents({ 'click': 'ctx.doSomething()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const subscribeSpy = jest.spyOn(handler, 'subscribe');

            handler.bind(undefined, () => undefined);

            expect(subscribeSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined, undefined);
            expect(handler['_subscribed'].has('click')).toBe(true);
        });
    });

    describe('R4-5: event names may contain the meta separator', () => {
        // The debounce segment is taken from the LAST separator and only when it parses as a number.
        // A non-numeric tail therefore belongs to the event name itself, which is what makes
        // namespaced names (`plugin:ready`, common in third-party libraries) subscribable at all.
        function createRawEvent(rawName: string, expression: string): Element {
            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}${rawName}`,
                expression
            );
            return el;
        }

        function buildHandler(rawName: string): Events {
            const el = createRawEvent(rawName, 'this.onEvent()');
            return new Events(el, new Attributes(el, () => false), mockGetManipulations, mockDetectChanges);
        }

        it('should keep a namespaced event name intact', () => {
            const handler = buildHandler(`plugin${Constants.META_VALUE_SEPARATOR}ready`);

            expect(handler.nExpression!.has('plugin:ready')).toBe(true);
            expect(handler.nExpression!.get('plugin:ready')!.debounce).toBeUndefined();
        });

        it('should keep a non-numeric suffix as part of the event name', () => {
            // Indistinguishable from `plugin:ready`, so it is treated the same way
            const handler = buildHandler(`click${Constants.META_VALUE_SEPARATOR}abc`);

            expect(handler.nExpression!.has('click:abc')).toBe(true);
            expect(handler.nExpression!.has('click')).toBe(false);
        });

        it('should still split a numeric debounce off a plain event name', () => {
            const handler = buildHandler(`input${Constants.META_VALUE_SEPARATOR}300`);

            expect(handler.nExpression!.has('input')).toBe(true);
            expect(handler.nExpression!.get('input')!.debounce).toBe(300);
        });

        it('should split the debounce off a namespaced event name', () => {
            const handler = buildHandler(`plugin${Constants.META_VALUE_SEPARATOR}ready${Constants.META_VALUE_SEPARATOR}250`);

            expect(handler.nExpression!.has('plugin:ready')).toBe(true);
            expect(handler.nExpression!.get('plugin:ready')!.debounce).toBe(250);
        });

        it('should keep a trailing separator as part of the event name', () => {
            // `nb-event:click:` no longer falls back to `click`: an empty tail is not a number,
            // so the whole raw name is the event name.
            const handler = buildHandler(`click${Constants.META_VALUE_SEPARATOR}`);

            expect(handler.nExpression!.has('click:')).toBe(true);
            expect(handler.nExpression!.has('click')).toBe(false);
        });

        it('should report nothing for a non-numeric tail — the mistyped debounce is silent', () => {
            // The `wrong debounce data` error was removed with R4-5: a bad debounce is
            // indistinguishable from a namespaced name, so neither is diagnosed.
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            try {
                buildHandler(`click${Constants.META_VALUE_SEPARATOR}abc`);
                buildHandler(`click${Constants.META_VALUE_SEPARATOR}`);
                expect(errorSpy).not.toHaveBeenCalled();
            } finally {
                errorSpy.mockRestore();
            }
        });

        it('should subscribe with the namespaced name and no debounce', () => {
            const el = createRawEvent(`plugin${Constants.META_VALUE_SEPARATOR}ready`, 'this.onEvent()');
            const handler = new Events(el, new Attributes(el, () => false), mockGetManipulations, mockDetectChanges);
            const subscribeSpy = jest.spyOn(handler, 'subscribe');

            handler.bind(undefined, () => undefined);

            expect(subscribeSpy).toHaveBeenCalledWith('plugin:ready', expect.any(Function), undefined, undefined);
        });
    });

    describe('debounce subscribe', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('debounce wraps callback in setTimeout', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            const callback = jest.fn();

            handler.subscribe('input', callback, undefined, 200);

            el.dispatchEvent(new Event('input'));
            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(200);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('debounce clears previous timeout on rapid events', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            const callback = jest.fn();

            handler.subscribe('input', callback, undefined, 200);

            el.dispatchEvent(new Event('input'));
            jest.advanceTimersByTime(100);
            el.dispatchEvent(new Event('input'));
            jest.advanceTimersByTime(200);
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('bind re-subscription on changed executionParams', () => {
        it('should re-subscribe when executionParams change', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const exec = jest.fn().mockReturnValue(undefined);

            // First bind
            handler.bind(undefined, exec);
            const firstUnSubscribe = handler['_subscribed'].get('click');
            expect(firstUnSubscribe).toBeDefined();

            // Second bind with different params — should unsubscribe and re-subscribe
            const newParams = { different: true } as any;
            handler.bind(newParams, exec);
            // Should still be subscribed, with a freshly created subscription
            expect(handler['_subscribed'].has('click')).toBe(true);
            expect(handler['_subscribed'].get('click')).not.toBe(firstUnSubscribe);
        });

        it('should skip already-unsubscribed events during re-subscription', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const exec = jest.fn().mockReturnValue(undefined);

            // First bind
            handler.bind(undefined, exec);

            // Manually unsubscribe
            const unsub = handler['_subscribed'].get('click');
            if (unsub) unsub();

            // Second bind with different params
            handler.bind({ x: 1 } as any, exec);
            // click was already unsubscribed, skip unsubscribe, re-subscribe
            expect(handler['_subscribed'].has('click')).toBe(true);
        });

        it('should not re-subscribe when executionParams are equal', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const exec = jest.fn().mockReturnValue(undefined);
            const subscribeSpy = jest.spyOn(handler, 'subscribe');

            handler.bind(undefined, exec);
            expect(subscribeSpy).toHaveBeenCalledTimes(1);

            // Same params → no re-subscription
            handler.bind(undefined, exec);
            expect(subscribeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('handleSubscription event dispatch', () => {
        beforeEach(() => {
            if (!Environment.router) {
                Environment.setupRouter(undefined);
            }
        });

        it('handleSubscription: sync expression invokes detectChanges', () => {
            const el = createElementWithEvents({ 'click': 'this.clicked = true' });
            const attrs = new Attributes(el, () => false);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            const exec = jest.fn().mockReturnValue('syncResult');
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            expect(exec).toHaveBeenCalled();
            expect(detectChanges).toHaveBeenCalled();
        });

        it('handleSubscription: async expression invokes detectChanges after resolution', async () => {
            const el = createElementWithEvents({ 'click': 'this.doAsync()' });
            const attrs = new Attributes(el, () => false);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            const exec = jest.fn().mockReturnValue(Promise.resolve());
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            // Wait for promise microtask
            await new Promise(r => setTimeout(r, 0));
            expect(detectChanges).toHaveBeenCalled();
        });

        it('handleSubscription: isSingleBinded sync expression unsubscribes after first call', () => {
            const el = createElementWithEvents({ 'click': '#this.val' });
            const attrs = new Attributes(el, () => false);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            const exec = jest.fn().mockReturnValue('result');
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));
            expect(handler['_unsubscribed'].has('click')).toBe(true);

            // The listener is gone — a second dispatch does not re-run the expression
            el.dispatchEvent(new Event('click'));
            expect(exec).toHaveBeenCalledTimes(1);
        });

        it('handleSubscription: isSingleBinded async expression unsubscribes after resolution', async () => {
            const el = createElementWithEvents({ 'click': '#this.asyncVal' });
            const attrs = new Attributes(el, () => false);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            const exec = jest.fn().mockReturnValue(Promise.resolve());
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            await new Promise(r => setTimeout(r, 0));
            expect(handler['_unsubscribed'].has('click')).toBe(true);
        });

        it('handleSubscription: the injected unSubscribe stops only the template handler', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const aspectCallback = jest.fn();
            handler.subscribe('click', aspectCallback);

            // The expression calls the injected unSubscribe param permanently
            const exec = jest.fn().mockImplementation((_expression, params) =>
                getExecutionParam(params, Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME)());
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));
            el.dispatchEvent(new Event('click'));

            expect(exec).toHaveBeenCalledTimes(1);
            expect(handler['_unsubscribed'].has('click')).toBe(true);
            // The manual subscriber is untouched by the template handler's unsubscribe (R2-2)
            expect(aspectCallback).toHaveBeenCalledTimes(2);
        });
    });

    describe('R6-6: rejected promises from async handlers', () => {
        // `process` is not typed in this project's tsconfig (no @types/node)
        const nodeProcess = (globalThis as any).process;

        async function withUnhandledRejectionWatch(run: () => Promise<void>): Promise<unknown[]> {
            const captured: unknown[] = [];
            const listener = (reason: unknown) => captured.push(reason);

            nodeProcess.on('unhandledRejection', listener);
            try {
                await run();
            } finally {
                nodeProcess.off('unhandledRejection', listener);
            }

            return captured;
        }

        it('a rejecting handler is logged and never escapes as an unhandled rejection', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const el = createElementWithEvents({ 'click': 'this.save()' });
            const attrs = new Attributes(el, () => false);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            const exec = jest.fn().mockReturnValue(Promise.reject(new Error('boom')));
            handler.bind(undefined, exec);

            const unhandled = await withUnhandledRejectionWatch(async () => {
                el.dispatchEvent(new Event('click'));
                await new Promise(r => setTimeout(r, 0));
            });

            expect(unhandled).toHaveLength(0);
            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy.mock.calls[0].map(String).join(' ')).toContain('click event promise error: Error: boom');
            errorSpy.mockRestore();
        });

        it('change detection still runs after a rejection', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const el = createElementWithEvents({ 'click': 'this.save()' });
            const attrs = new Attributes(el, () => false);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            handler.bind(undefined, jest.fn().mockReturnValue(Promise.reject(new Error('boom'))));

            await withUnhandledRejectionWatch(async () => {
                el.dispatchEvent(new Event('click'));
                await new Promise(r => setTimeout(r, 0));
            });

            expect(detectChanges).toHaveBeenCalledTimes(1);
            errorSpy.mockRestore();
        });

        it('a rejected single-bind (#) handler stays subscribed - by design, one-time means one success', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const el = createElementWithEvents({ 'click': '#this.save()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, jest.fn());

            const exec = jest.fn().mockReturnValue(Promise.reject(new Error('boom')));
            handler.bind(undefined, exec);

            await withUnhandledRejectionWatch(async () => {
                el.dispatchEvent(new Event('click'));
                await new Promise(r => setTimeout(r, 0));
            });

            // The attempt did not complete, so the one-time subscription is kept alive
            expect(handler['_unsubscribed'].has('click')).toBe(false);

            await withUnhandledRejectionWatch(async () => {
                el.dispatchEvent(new Event('click'));
                await new Promise(r => setTimeout(r, 0));
            });

            expect(exec).toHaveBeenCalledTimes(2);
            errorSpy.mockRestore();
        });
    });

    describe('unsubscribe idempotency', () => {
        it('calling unsubscribe twice does not throw', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            const unsub = handler.subscribe('click', jest.fn());
            unsub();
            // The listener is already gone, so a second call is a no-op
            // (removeEventListener is also a no-op for an unknown listener).
            expect(() => unsub()).not.toThrow();
        });

        it('the injected permanent unSubscribe short-circuits on repeat calls', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            let injectedUnSubscribe: (() => void) | undefined;
            const exec = jest.fn().mockImplementation((_expression, params) => {
                injectedUnSubscribe = getExecutionParam(params, Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME);
                injectedUnSubscribe!();
            });
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            // Second call short-circuits because the eventName is already in _unsubscribed
            expect(() => injectedUnSubscribe!()).not.toThrow();
            expect(handler['_unsubscribed'].has('click')).toBe(true);
        });
    });

    describe('R2-4: stale unSubscribe from a replaced subscription generation', () => {
        function captureInjectedUnSubscribe(): { el: Element, handler: Events, exec: jest.Mock, last: () => (() => void) } {
            const el = createElementWithEvents({ 'click': 'this.onClick(unSubscribe)' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            let injected: (() => void) | undefined;
            const exec = jest.fn().mockImplementation((_expression, params) => {
                injected = getExecutionParam(params, Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME);
            });

            return { el, handler, exec, last: () => injected! };
        }

        it('leaves the current subscription alone when a stale unSubscribe is called', () => {
            const { el, handler, exec, last } = captureInjectedUnSubscribe();

            handler.bind(new ExecutionParams(['a'], [1]), exec);
            el.dispatchEvent(new Event('click'));
            const staleUnSubscribe = last();

            // A param change tears the first subscription down and creates a new one
            handler.bind(new ExecutionParams(['a'], [2]), exec);
            el.dispatchEvent(new Event('click'));
            expect(exec).toHaveBeenCalledTimes(2);

            // The unsubscribe handed out by the *previous* generation is inert
            staleUnSubscribe();
            expect(handler['_unsubscribed'].has('click')).toBe(false);
            expect(handler['_subscribed'].has('click')).toBe(true);

            el.dispatchEvent(new Event('click'));
            expect(exec).toHaveBeenCalledTimes(3);
            expect(getExecutionParam(exec.mock.calls[2][1], 'a')).toBe(2);
        });

        it('keeps the current subscription reachable by the next teardown and by dispose', () => {
            const { el, handler, exec, last } = captureInjectedUnSubscribe();

            handler.bind(new ExecutionParams(['a'], [1]), exec);
            el.dispatchEvent(new Event('click'));
            const staleUnSubscribe = last();

            handler.bind(new ExecutionParams(['a'], [2]), exec);
            staleUnSubscribe();

            // The next param change still re-creates the subscription with the fresh params
            handler.bind(new ExecutionParams(['a'], [3]), exec);
            el.dispatchEvent(new Event('click'));
            expect(getExecutionParam(exec.mock.calls[1][1], 'a')).toBe(3);

            // ...and dispose still owns that listener
            handler.dispose();
            el.dispatchEvent(new Event('click'));
            expect(exec).toHaveBeenCalledTimes(2);
            expect(handler['_subscribed'].size).toBe(0);
            expect(handler['_unsubscribed'].size).toBe(0);
        });

        it('still unsubscribes permanently when the injected unSubscribe is called in its own generation', () => {
            const { el, handler, exec, last } = captureInjectedUnSubscribe();

            handler.bind(new ExecutionParams(['a'], [1]), exec);
            el.dispatchEvent(new Event('click'));
            last()();

            expect(handler['_unsubscribed'].has('click')).toBe(true);
            expect(handler['_subscribed'].has('click')).toBe(false);

            // A param change must not resurrect a permanently unsubscribed event
            handler.bind(new ExecutionParams(['a'], [2]), exec);
            el.dispatchEvent(new Event('click'));
            expect(exec).toHaveBeenCalledTimes(1);
            expect(handler['_subscribed'].has('click')).toBe(false);
        });
    });

    describe('dispose', () => {
        it('removes the listener for every template subscription and clears tracking maps', () => {
            const el = createElementWithEvents({
                'click': 'this.onClick()',
                'mouseover': 'this.onHover()'
            });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const exec = jest.fn().mockReturnValue(undefined);
            handler.bind(undefined, exec);

            handler.dispose();

            // Both listeners are removed — events should no longer run their expressions
            el.dispatchEvent(new Event('click'));
            el.dispatchEvent(new Event('mouseover'));
            expect(exec).not.toHaveBeenCalled();

            expect(handler['_subscribed'].size).toBe(0);
            expect(handler['_unsubscribed'].size).toBe(0);
        });

        it('leaves manual subscriptions to their owner — dispose does not track them', () => {
            // Subscriptions made through ElementSubscriptions.subscribe are not registered in
            // _subscribed, so the caller owns the returned unsubscribe function.
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);

            handler.dispose();

            el.dispatchEvent(new Event('click'));
            expect(callback).toHaveBeenCalledTimes(1);

            unsub();
            el.dispatchEvent(new Event('click'));
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('is safe to call when there are no subscriptions', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            expect(() => handler.dispose()).not.toThrow();
        });
    });

    describe('commit', () => {
        it('always returns false', () => {
            const el = createElementWithEvents({ 'click': 'this.x' });
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            expect(handler.commit()).toBe(false);
        });
    });

    describe('bind with no expression', () => {
        it('returns executionParams unchanged', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            const params = { x: 1 } as any;
            expect(handler.bind(params, jest.fn())).toBe(params);
        });
    });
});
