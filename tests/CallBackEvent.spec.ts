import { CallBackEvent } from '../src/CallBackEvent';

describe('CallBackEvent', () => {
    it('should invoke subscribed callback on raise', () => {
        const event = new CallBackEvent<(data: string) => void>();
        const mockFn = jest.fn();

        event.subscribe(mockFn);
        event.raise('hello');

        expect(mockFn).toHaveBeenCalledWith('hello');
    });

    it('should invoke multiple subscribers on raise', () => {
        const event = new CallBackEvent<(data: number) => void>();
        const fn1 = jest.fn();
        const fn2 = jest.fn();
        const fn3 = jest.fn();

        event.subscribe(fn1);
        event.subscribe(fn2);
        event.subscribe(fn3);
        event.raise(42);

        expect(fn1).toHaveBeenCalledWith(42);
        expect(fn2).toHaveBeenCalledWith(42);
        expect(fn3).toHaveBeenCalledWith(42);
    });

    it('should invoke callbacks in subscription order', () => {
        const event = new CallBackEvent<() => void>();
        const order: number[] = [];

        event.subscribe(() => order.push(1));
        event.subscribe(() => order.push(2));
        event.subscribe(() => order.push(3));
        event.raise();

        expect(order).toEqual([1, 2, 3]);
    });

    it('should pass multiple arguments to callbacks', () => {
        const event = new CallBackEvent<(a: string, b: number) => void>();
        const mockFn = jest.fn();

        event.subscribe(mockFn);
        event.raise('hello', 42);

        expect(mockFn).toHaveBeenCalledWith('hello', 42);
    });

    it('should unsubscribe a specific callback', () => {
        const event = new CallBackEvent<(data: string) => void>();
        const fn1 = jest.fn();
        const fn2 = jest.fn();

        const unsubscribe1 = event.subscribe(fn1);
        event.subscribe(fn2);

        unsubscribe1();
        event.raise('test');

        expect(fn1).not.toHaveBeenCalled();
        expect(fn2).toHaveBeenCalledWith('test');
    });

    it('should not throw when raising with no subscribers', () => {
        const event = new CallBackEvent<() => void>();
        expect(() => event.raise()).not.toThrow();
    });

    it('should not add the same callback twice', () => {
        const event = new CallBackEvent<() => void>();
        const mockFn = jest.fn();

        event.subscribe(mockFn);
        event.subscribe(mockFn);
        event.raise();

        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe called multiple times', () => {
        const event = new CallBackEvent<() => void>();
        const mockFn = jest.fn();

        const unsub = event.subscribe(mockFn);
        unsub();
        unsub(); // Should not throw

        event.raise();
        expect(mockFn).not.toHaveBeenCalled();
    });

    it('should allow re-subscribing after unsubscribe', () => {
        const event = new CallBackEvent<(data: string) => void>();
        const mockFn = jest.fn();

        const unsub = event.subscribe(mockFn);
        unsub();

        event.subscribe(mockFn);
        event.raise('again');

        expect(mockFn).toHaveBeenCalledWith('again');
    });

    it('should aggregate errors and still invoke remaining callbacks when one throws', () => {
        const event = new CallBackEvent<() => void>();
        const fn1 = jest.fn(() => { throw new Error('callback error'); });
        const fn2 = jest.fn();

        event.subscribe(fn1);
        event.subscribe(fn2);

        // raise() catches each callback's error, runs all callbacks, then throws an aggregated Error.
        expect(() => event.raise()).toThrow(/one or more callbacks failed/);
        expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should aggregate multiple errors into a single thrown Error', () => {
        const event = new CallBackEvent<() => void>();
        const fn1 = jest.fn(() => { throw new Error('first error'); });
        const fn2 = jest.fn();
        const fn3 = jest.fn(() => { throw new Error('third error'); });

        event.subscribe(fn1);
        event.subscribe(fn2);
        event.subscribe(fn3);

        let caught: Error | undefined;
        try { event.raise(); } catch (ex) { caught = ex as Error; }

        expect(caught).toBeDefined();
        expect(caught!.message).toContain('first error');
        expect(caught!.message).toContain('third error');
        // The non-throwing callback in the middle still ran
        expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should handle raise with no arguments when callbacks expect them', () => {
        const event = new CallBackEvent<(a: string, b: number) => void>();
        const mockFn = jest.fn();

        event.subscribe(mockFn);
        event.raise();

        expect(mockFn).toHaveBeenCalledWith();
    });

    describe('iteration safety during raise', () => {
        it('should not invoke a newly-subscribed callback during the same raise', () => {
            const event = new CallBackEvent<() => void>();
            const lateFn = jest.fn();

            event.subscribe(() => {
                event.subscribe(lateFn);
            });
            event.raise();

            // The newly subscribed callback was added mid-raise but should NOT fire on this pass.
            expect(lateFn).not.toHaveBeenCalled();

            // It should fire on the next raise though.
            event.raise();
            expect(lateFn).toHaveBeenCalledTimes(1);
        });

        it('should still invoke a callback that was unsubscribed during the same raise', () => {
            const event = new CallBackEvent<() => void>();
            const fn2 = jest.fn();
            let unsub2: () => void = () => {};

            event.subscribe(() => {
                // Unsubscribe fn2 from inside fn1 — but raise iterates a snapshot,
                // so fn2 should still be called on this pass.
                unsub2();
            });
            unsub2 = event.subscribe(fn2);

            event.raise();
            expect(fn2).toHaveBeenCalledTimes(1);

            // On the next raise, fn2 is gone.
            event.raise();
            expect(fn2).toHaveBeenCalledTimes(1);
        });

        it('should call all originally-subscribed callbacks even if one unsubscribes itself', () => {
            const event = new CallBackEvent<() => void>();
            const fn3 = jest.fn();
            let unsub1: () => void = () => {};

            const fn1 = jest.fn(() => unsub1());
            unsub1 = event.subscribe(fn1);
            event.subscribe(jest.fn());
            event.subscribe(fn3);

            event.raise();
            expect(fn1).toHaveBeenCalledTimes(1);
            expect(fn3).toHaveBeenCalledTimes(1);
        });
    });
});
