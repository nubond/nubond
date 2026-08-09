import { Events } from '../../../src/nElement/handlers/Events';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';
import { Environment } from '../../../src/Environment';

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
    const mockGetShowDebugInfo = () => false;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect event bindings', () => {
        const el = createElementWithEvents({ 'click': 'ctx.onClick($event)' });
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
        expect(handler.nExpression!.has('click')).toBe(true);
    });

    it('should have no expression when no event attributes', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should support multiple events', () => {
        const el = createElementWithEvents({
            'click': 'ctx.onClick()',
            'mouseover': 'ctx.onHover()'
        });
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

        expect(handler.nExpression!.size).toBe(2);
    });

    it('isDirty should always be false', () => {
        const el = createElementWithEvents({ 'click': 'ctx.onClick()' });
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

        expect(handler.isDirty).toBe(false);
    });

    describe('subscribe/unsubscribe', () => {
        it('should subscribe to a DOM event', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);

            expect(typeof unsub).toBe('function');

            el.dispatchEvent(new Event('click'));
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should invoke callback when event fires', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const callback = jest.fn();
            handler.subscribe('click', callback);

            el.dispatchEvent(new Event('click'));
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should register independent listeners for every subscriber of the same event', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);
            unsub();

            // Listener was removed, so the callback should NOT fire
            el.dispatchEvent(new Event('click'));
            expect(callback).not.toHaveBeenCalled();
        });

        it('should hand every subscriber its own unsubscribe (R2-2)', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            handler.subscribe('click', jest.fn());

            expect(handler['_subscriptionData'].size).toBe(0);
            expect(handler['_unSubscribedData'].size).toBe(0);
        });
    });

    describe('bind', () => {
        it('should set up event subscriptions on first bind', () => {
            const el = createElementWithEvents({ 'click': 'ctx.onClick($event)' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            handler.bind(undefined, () => undefined);
            expect(handler['_subscriptionData'].has('click')).toBe(true);
        });
    });

    describe('debounce', () => {
        it('should detect debounce from attribute name', () => {
            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}input${Constants.META_VALUE_SEPARATOR}300`,
                'ctx.onInput($event)'
            );
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            expect(handler.nExpression!.has('focus')).toBe(true);
            expect(handler.nExpression!.size).toBe(1);
        });
    });

    describe('bind subscription', () => {
        it('should call subscribe on ElementSubscriptions when not yet subscribed', () => {
            const el = createElementWithEvents({ 'click': 'ctx.doSomething()' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const subscribeSpy = jest.spyOn(handler, 'subscribe');

            handler.bind(undefined, () => undefined);

            expect(subscribeSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined, undefined);
            expect(handler['_subscriptionData'].has('click')).toBe(true);
        });
    });

    describe('debounce with non-number suffix', () => {
        it('should split at the separator and drop the non-number debounce suffix', () => {
            const el = document.createElement('div');
            // nb-event:click:abc → debounce parse yields NaN, so eventName = "click" (suffix discarded, no debounce)
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}click${Constants.META_VALUE_SEPARATOR}abc`,
                'this.onClick()'
            );
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            expect(handler.hasNExpression).toBe(true);
            // eventName is "click" and the invalid "abc" debounce is ignored
            expect(handler.nExpression!.has('click')).toBe(true);
            expect(handler.nExpression!.get('click')!.debounce).toBeUndefined();
        });
    });

    describe('debounce subscribe', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('debounce wraps callback in setTimeout', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);
            const callback = jest.fn();

            handler.subscribe('input', callback, undefined, 200);

            el.dispatchEvent(new Event('input'));
            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(200);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('debounce clears previous timeout on rapid events', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);
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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const exec = jest.fn().mockReturnValue(undefined);

            // First bind
            handler.bind(undefined, exec);
            const firstUnSubscribe = handler['_subscriptionData'].get('click');
            expect(firstUnSubscribe).toBeDefined();

            // Second bind with different params — should unsubscribe and re-subscribe
            const newParams = { different: true } as any;
            handler.bind(newParams, exec);
            // Should still be subscribed, with a freshly created subscription
            expect(handler['_subscriptionData'].has('click')).toBe(true);
            expect(handler['_subscriptionData'].get('click')).not.toBe(firstUnSubscribe);
        });

        it('should skip already-unsubscribed events during re-subscription', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const exec = jest.fn().mockReturnValue(undefined);

            // First bind
            handler.bind(undefined, exec);

            // Manually unsubscribe
            const unsub = handler['_subscriptionData'].get('click');
            if (unsub) unsub();

            // Second bind with different params
            handler.bind({ x: 1 } as any, exec);
            // click was already unsubscribed, skip unsubscribe, re-subscribe
            expect(handler['_subscriptionData'].has('click')).toBe(true);
        });

        it('should not re-subscribe when executionParams are equal', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

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
            const attrs = new Attributes(el);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges, mockGetShowDebugInfo);

            const exec = jest.fn().mockReturnValue('syncResult');
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            expect(exec).toHaveBeenCalled();
            expect(detectChanges).toHaveBeenCalled();
        });

        it('handleSubscription: async expression invokes detectChanges after resolution', async () => {
            const el = createElementWithEvents({ 'click': 'this.doAsync()' });
            const attrs = new Attributes(el);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges, mockGetShowDebugInfo);

            const exec = jest.fn().mockReturnValue(Promise.resolve());
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            // Wait for promise microtask
            await new Promise(r => setTimeout(r, 0));
            expect(detectChanges).toHaveBeenCalled();
        });

        it('handleSubscription: isSingleBinded sync expression unsubscribes after first call', () => {
            const el = createElementWithEvents({ 'click': '#this.val' });
            const attrs = new Attributes(el);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges, mockGetShowDebugInfo);

            const exec = jest.fn().mockReturnValue('result');
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));
            expect(handler['_unSubscribedData'].has('click')).toBe(true);

            // The listener is gone — a second dispatch does not re-run the expression
            el.dispatchEvent(new Event('click'));
            expect(exec).toHaveBeenCalledTimes(1);
        });

        it('handleSubscription: isSingleBinded async expression unsubscribes after resolution', async () => {
            const el = createElementWithEvents({ 'click': '#this.asyncVal' });
            const attrs = new Attributes(el);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges, mockGetShowDebugInfo);

            const exec = jest.fn().mockReturnValue(Promise.resolve());
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            await new Promise(r => setTimeout(r, 0));
            expect(handler['_unSubscribedData'].has('click')).toBe(true);
        });

        it('handleSubscription: the injected unSubscribe stops only the template handler', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const aspectCallback = jest.fn();
            handler.subscribe('click', aspectCallback);

            // The expression calls the injected unSubscribe param permanently
            const exec = jest.fn().mockImplementation((_expression, params) =>
                getExecutionParam(params, Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME)());
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));
            el.dispatchEvent(new Event('click'));

            expect(exec).toHaveBeenCalledTimes(1);
            expect(handler['_unSubscribedData'].has('click')).toBe(true);
            // The manual subscriber is untouched by the template handler's unsubscribe (R2-2)
            expect(aspectCallback).toHaveBeenCalledTimes(2);
        });
    });

    describe('unsubscribe idempotency', () => {
        it('calling unsubscribe twice does not throw', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);
            const unsub = handler.subscribe('click', jest.fn());
            unsub();
            // The listener is already gone, so a second call is a no-op
            // (removeEventListener is also a no-op for an unknown listener).
            expect(() => unsub()).not.toThrow();
        });

        it('the injected permanent unSubscribe short-circuits on repeat calls', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            let injectedUnSubscribe: (() => void) | undefined;
            const exec = jest.fn().mockImplementation((_expression, params) => {
                injectedUnSubscribe = getExecutionParam(params, Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME);
                injectedUnSubscribe!();
            });
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            // Second call short-circuits because the eventName is already in _unSubscribedData
            expect(() => injectedUnSubscribe!()).not.toThrow();
            expect(handler['_unSubscribedData'].has('click')).toBe(true);
        });
    });

    describe('dispose', () => {
        it('removes the listener for every template subscription and clears tracking maps', () => {
            const el = createElementWithEvents({
                'click': 'this.onClick()',
                'mouseover': 'this.onHover()'
            });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

            const exec = jest.fn().mockReturnValue(undefined);
            handler.bind(undefined, exec);

            handler.dispose();

            // Both listeners are removed — events should no longer run their expressions
            el.dispatchEvent(new Event('click'));
            el.dispatchEvent(new Event('mouseover'));
            expect(exec).not.toHaveBeenCalled();

            expect(handler['_subscriptionData'].size).toBe(0);
            expect(handler['_unSubscribedData'].size).toBe(0);
        });

        it('leaves manual subscriptions to their owner — dispose does not track them', () => {
            // Subscriptions made through ElementSubscriptions.subscribe are not registered in
            // _subscriptionData, so the caller owns the returned unsubscribe function.
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);

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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);
            expect(() => handler.dispose()).not.toThrow();
        });
    });

    describe('commit', () => {
        it('always returns false', () => {
            const el = createElementWithEvents({ 'click': 'this.x' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);
            expect(handler.commit()).toBe(false);
        });
    });

    describe('bind with no expression', () => {
        it('returns executionParams unchanged', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges, mockGetShowDebugInfo);
            const params = { x: 1 } as any;
            expect(handler.bind(params, jest.fn())).toBe(params);
        });
    });
});
