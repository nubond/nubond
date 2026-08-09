import { ElementSubscriptions } from '../../src/models/injections/ElementSubscriptions';

describe('ElementSubscriptions', () => {
    let subs: ElementSubscriptions;
    let subscribe: jest.Mock;

    beforeEach(() => {
        subscribe = jest.fn().mockReturnValue(() => {});
        subs = new ElementSubscriptions(subscribe);
    });

    it('should subscribe to an event', () => {
        const callback = jest.fn();
        const unsub = subs.subscribe('click', callback);

        expect(subscribe).toHaveBeenCalledWith('click', callback, undefined, undefined);
        expect(typeof unsub).toBe('function');
    });

    it('should subscribe with options', () => {
        const callback = jest.fn();
        subs.subscribe('click', callback, { capture: true });

        expect(subscribe).toHaveBeenCalledWith('click', callback, { capture: true }, undefined);
    });

    it('should subscribe with debounce', () => {
        const callback = jest.fn();
        subs.subscribe('click', callback, false, 300);

        expect(subscribe).toHaveBeenCalledWith('click', callback, false, 300);
    });

    it('should return unsubscribe function', () => {
        const mockUnsub = jest.fn();
        subscribe.mockReturnValue(mockUnsub);

        const unsub = subs.subscribe('click', jest.fn());
        unsub();

        expect(mockUnsub).toHaveBeenCalled();
    });

    it('should delegate every subscription to the same event separately (R2-2)', () => {
        const unsub1 = jest.fn();
        const unsub2 = jest.fn();
        subscribe.mockReturnValueOnce(unsub1).mockReturnValueOnce(unsub2);

        const cb1 = jest.fn();
        const cb2 = jest.fn();
        const first = subs.subscribe('click', cb1);
        const second = subs.subscribe('click', cb2);

        expect(subscribe).toHaveBeenCalledTimes(2);
        expect(first).not.toBe(second);

        first();
        expect(unsub1).toHaveBeenCalledTimes(1);
        expect(unsub2).not.toHaveBeenCalled();
    });

    it('should work with custom event names', () => {
        const callback = jest.fn();
        subs.subscribe('my-custom-event', callback);

        expect(subscribe).toHaveBeenCalledWith('my-custom-event', callback, undefined, undefined);
    });
});
