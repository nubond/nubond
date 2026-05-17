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
