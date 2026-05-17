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

    const mockGetManipulations = () => ({} as any);
    const mockDetectChanges = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect event bindings', () => {
        const el = createElementWithEvents({ 'click': 'ctx.onClick($event)' });
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
        expect(handler.nExpression!.has('click')).toBe(true);
    });

    it('should have no expression when no event attributes', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should support multiple events', () => {
        const el = createElementWithEvents({
            'click': 'ctx.onClick()',
            'mouseover': 'ctx.onHover()'
        });
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.nExpression!.size).toBe(2);
    });

    it('isDirty should always be false', () => {
        const el = createElementWithEvents({ 'click': 'ctx.onClick()' });
        const attrs = new Attributes(el);
        const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

        expect(handler.isDirty).toBe(false);
    });

    describe('subscribe/unsubscribe', () => {
        it('should subscribe to a DOM event', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);

            expect(handler.isSubscribed('click')).toBe(true);
            expect(typeof unsub).toBe('function');
        });

        it('should invoke callback when event fires', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            handler.subscribe('click', callback);

            el.dispatchEvent(new Event('click'));
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should not subscribe twice to same event', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            handler.subscribe('click', cb1);
            handler.subscribe('click', cb2);

            el.dispatchEvent(new Event('click'));
            // Only first callback registered
            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).not.toHaveBeenCalled();
        });

        it('should unsubscribe from event (transient)', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);
            unsub(); // transient — removes the listener but does NOT mark as permanently unsubscribed

            // Listener was removed, so the callback should NOT fire
            el.dispatchEvent(new Event('click'));
            expect(callback).not.toHaveBeenCalled();

            // A transient unsubscribe does not flip the "permanently unsubscribed" flag
            expect(handler.isUnSubscribed('click')).toBe(false);
        });

        it('should mark as permanently unsubscribed when unsub(true) is called', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const callback = jest.fn();
            const unsub = handler.subscribe('click', callback);
            unsub(true); // permanent

            expect(handler.isUnSubscribed('click')).toBe(true);

            el.dispatchEvent(new Event('click'));
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('bind', () => {
        it('should set up event subscriptions on first bind', () => {
            const el = createElementWithEvents({ 'click': 'ctx.onClick($event)' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            handler.bind(undefined, () => undefined);
            expect(handler.isSubscribed('click')).toBe(true);
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
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            expect(handler.nExpression!.has('focus')).toBe(true);
            expect(handler.nExpression!.size).toBe(1);
        });
    });

    describe('bind subscription', () => {
        it('should call subscribe on ElementSubscriptions when not yet subscribed', () => {
            const el = createElementWithEvents({ 'click': 'ctx.doSomething()' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const subscribeSpy = jest.spyOn(handler, 'subscribe');

            handler.bind(undefined, () => undefined);

            expect(subscribeSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined, undefined);
            expect(handler.isSubscribed('click')).toBe(true);
        });
    });

    describe('debounce with non-number suffix', () => {
        it('should use full rawEventName when debounce suffix is not a number', () => {
            const el = document.createElement('div');
            // nb-event:click:abc → debounce parse yields NaN, so eventName = "click:abc"
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}click${Constants.META_VALUE_SEPARATOR}abc`,
                'this.onClick()'
            );
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            expect(handler.hasNExpression).toBe(true);
            // eventName should be "click:abc" since "abc" is not a valid number
            expect(handler.nExpression!.has('click:abc')).toBe(true);
        });
    });

    describe('debounce subscribe', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('debounce wraps callback in setTimeout', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const exec = jest.fn().mockReturnValue(undefined);

            // First bind
            handler.bind(undefined, exec);
            expect(handler.isSubscribed('click')).toBe(true);

            // Second bind with different params — should unsubscribe and re-subscribe
            const newParams = { different: true } as any;
            handler.bind(newParams, exec);
            // Should still be subscribed (re-subscribed)
            expect(handler.isSubscribed('click')).toBe(true);
        });

        it('should skip already-unsubscribed events during re-subscription', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const exec = jest.fn().mockReturnValue(undefined);

            // First bind
            handler.bind(undefined, exec);

            // Manually unsubscribe
            const unsub = handler['_subscriptionData'].get('click');
            if (unsub) unsub();

            // Second bind with different params
            handler.bind({ x: 1 } as any, exec);
            // click was already unsubscribed, skip unsubscribe, re-subscribe
            expect(handler.isSubscribed('click')).toBe(true);
        });

        it('should not re-subscribe when executionParams are equal', () => {
            const el = createElementWithEvents({ 'click': 'this.onClick()' });
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            const exec = jest.fn().mockReturnValue('result');
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));
            expect(handler.isUnSubscribed('click')).toBe(true);
        });

        it('handleSubscription: isSingleBinded async expression unsubscribes after resolution', async () => {
            const el = createElementWithEvents({ 'click': '#this.asyncVal' });
            const attrs = new Attributes(el);
            const detectChanges = jest.fn();
            const handler = new Events(el, attrs, mockGetManipulations, detectChanges);

            const exec = jest.fn().mockReturnValue(Promise.resolve());
            handler.bind(undefined, exec);

            el.dispatchEvent(new Event('click'));

            await new Promise(r => setTimeout(r, 0));
            expect(handler.isUnSubscribed('click')).toBe(true);
        });
    });

    describe('unsubscribe idempotency', () => {
        it('calling permanent unsubscribe twice does not throw and stays unsubscribed', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            const unsub = handler.subscribe('click', jest.fn());
            unsub(true);
            // Second call short-circuits because the eventName is already in _unSubscribedData
            expect(() => unsub(true)).not.toThrow();
            expect(handler.isUnSubscribed('click')).toBe(true);
        });

        it('calling transient unsubscribe twice does not throw', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            const unsub = handler.subscribe('click', jest.fn());
            unsub();
            // Transient unsubscribe doesn't flag _unSubscribedData; the listener is already gone,
            // so a second transient call is a no-op (removeEventListener is also a no-op for an unknown listener).
            expect(() => unsub()).not.toThrow();
            expect(handler.isUnSubscribed('click')).toBe(false);
        });
    });

    describe('dispose', () => {
        it('removes the listener for every subscription and clears tracking maps', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);

            const cb1 = jest.fn();
            const cb2 = jest.fn();
            handler.subscribe('click', cb1);
            handler.subscribe('mouseover', cb2);

            handler.dispose();

            // Both listeners are removed — events should no longer fire
            el.dispatchEvent(new Event('click'));
            el.dispatchEvent(new Event('mouseover'));
            expect(cb1).not.toHaveBeenCalled();
            expect(cb2).not.toHaveBeenCalled();

            // After dispose, isSubscribed/isUnSubscribed are reset
            expect(handler.isSubscribed('click')).toBe(false);
            expect(handler.isSubscribed('mouseover')).toBe(false);
            expect(handler.isUnSubscribed('click')).toBe(false);
        });

        it('is safe to call when there are no subscriptions', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            expect(() => handler.dispose()).not.toThrow();
        });
    });

    describe('commit', () => {
        it('always returns false', () => {
            const el = createElementWithEvents({ 'click': 'this.x' });
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            expect(handler.commit()).toBe(false);
        });
    });

    describe('bind with no expression', () => {
        it('returns executionParams unchanged', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Events(el, attrs, mockGetManipulations, mockDetectChanges);
            const params = { x: 1 } as any;
            expect(handler.bind(params, jest.fn())).toBe(params);
        });
    });
});
