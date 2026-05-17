import { ElementSubscriptions } from '../../src/models/injections/ElementSubscriptions';

describe('ElementSubscriptions', () => {
    let subs: ElementSubscriptions;
    let isSubscribed: jest.Mock;
    let isUnSubscribed: jest.Mock;
    let subscribe: jest.Mock;

    beforeEach(() => {
        isSubscribed = jest.fn();
        isUnSubscribed = jest.fn();
        subscribe = jest.fn().mockReturnValue(() => {});
        subs = new ElementSubscriptions(isSubscribed, isUnSubscribed, subscribe);
    });

    it('should check if subscribed', () => {
        isSubscribed.mockReturnValue(true);
        expect(subs.isSubscribed('click')).toBe(true);
        expect(isSubscribed).toHaveBeenCalledWith('click');
    });

    it('should check if unSubscribed', () => {
        isUnSubscribed.mockReturnValue(true);
        expect(subs.isUnSubscribed('click')).toBe(true);
        expect(isUnSubscribed).toHaveBeenCalledWith('click');
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

    it('should work with custom event names', () => {
        const callback = jest.fn();
        subs.subscribe('my-custom-event', callback);

        expect(subscribe).toHaveBeenCalledWith('my-custom-event', callback, undefined, undefined);
    });
});
