import { EventDispatcher } from '../../src/models/injections/EventDispatcher';

describe('EventDispatcher', () => {
    let element: Element;
    let dispatcher: EventDispatcher;

    beforeEach(() => {
        element = document.createElement('div');
        dispatcher = new EventDispatcher(element);
    });

    it('should dispatch a named CustomEvent', () => {
        const handler = jest.fn();
        element.addEventListener('my-event', handler);

        dispatcher.dispatch('my-event');
        expect(handler).toHaveBeenCalled();
    });

    it('should dispatch CustomEvent with detail data', () => {
        let receivedDetail: any;
        element.addEventListener('my-event', (evt: Event) => {
            receivedDetail = (evt as CustomEvent).detail;
        });

        dispatcher.dispatch('my-event', { foo: 'bar' });
        expect(receivedDetail).toEqual({ foo: 'bar' });
    });

    it('should dispatch a pre-built Event object', () => {
        const handler = jest.fn();
        element.addEventListener('click', handler);

        const event = new Event('click');
        dispatcher.dispatch(event);
        expect(handler).toHaveBeenCalled();
    });

    it('should return boolean result from dispatchEvent', () => {
        const result = dispatcher.dispatch('test-event');
        expect(typeof result).toBe('boolean');
    });

    it('should dispatch without data (undefined detail)', () => {
        let receivedEvent: CustomEvent | undefined;
        element.addEventListener('no-data', (evt: Event) => {
            receivedEvent = evt as CustomEvent;
        });

        dispatcher.dispatch('no-data');
        expect(receivedEvent).toBeDefined();
    });

    // L-26: HTML lowercases attribute names, so nb-event:myEvent subscribes to 'myevent';
    // the dispatching site lowercases the name so a camelCase dispatch still reaches it.
    describe('L-26: event names are lowercased at the dispatching site', () => {
        it('should dispatch a camelCase name as its lowercase form', () => {
            const lower = jest.fn();
            const camel = jest.fn();
            element.addEventListener('myevent', lower);
            element.addEventListener('myEvent', camel);

            dispatcher.dispatch('myEvent', 1);

            expect(lower).toHaveBeenCalledTimes(1);
            expect((lower.mock.calls[0][0] as CustomEvent).type).toBe('myevent');
            expect(camel).not.toHaveBeenCalled();
        });

        it('should reach an nb-event subscription written in camelCase in the template', () => {
            const host = document.createElement('div');
            host.innerHTML = '<span nb-event:myEvent="x"></span>';
            const span = host.querySelector('span')!;
            const handler = jest.fn();
            // what the parsed attribute name resolves to
            expect(span.getAttributeNames()).toEqual(['nb-event:myevent']);
            span.addEventListener('myevent', handler);

            new EventDispatcher(span).dispatch('myEvent');
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should NOT rename a pre-built Event object', () => {
            const camel = jest.fn();
            element.addEventListener('myEvent', camel);

            dispatcher.dispatch(new CustomEvent('myEvent'));
            expect(camel).toHaveBeenCalledTimes(1);
        });
    });

    // L-27 (by design): a CustomEventInit member set to undefined is "not present" per WebIDL, so detail
    // takes its null default — the framework follows the web platform here instead of working around it.
    it('should deliver a null detail when dispatched without data or with undefined, per the DOM spec (L-27, by design)', () => {
        const details: Array<any> = [];
        element.addEventListener('no-data', (evt: Event) => details.push((evt as CustomEvent).detail));

        dispatcher.dispatch('no-data');
        dispatcher.dispatch('no-data', undefined);
        dispatcher.dispatch('no-data', null);

        expect(details).toEqual([null, null, null]);
    });

    it('should allow cancelling event', () => {
        element.addEventListener('cancel-test', (evt: Event) => {
            evt.preventDefault();
        });

        // dispatchEvent returns false if preventDefault was called on a cancelable event
        const event = new CustomEvent('cancel-test', { cancelable: true });
        const result = dispatcher.dispatch(event);
        expect(result).toBe(false);
    });
});
