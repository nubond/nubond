import { ReflectInitializer } from '../../src/initializers/ReflectInitializer';
import { Helpers } from '../../src/Helpers';

describe('ReflectInitializer', () => {
    const REFLECT = Reflect as any;

    beforeEach(() => {
        // Remove polyfills before each test to test fresh init
        delete REFLECT.metadata;
        delete REFLECT.getMetadata;
    });

    afterEach(() => {
        // Re-init for other tests that might depend on it
        ReflectInitializer.init();
    });

    it('should polyfill Reflect.metadata if not present', () => {
        ReflectInitializer.init();
        expect(typeof REFLECT.metadata).toBe('function');
    });

    it('should polyfill Reflect.getMetadata if not present', () => {
        ReflectInitializer.init();
        expect(typeof REFLECT.getMetadata).toBe('function');
    });

    it('should store and retrieve class-level metadata', () => {
        ReflectInitializer.init();

        class MyClass {}
        const decorator = REFLECT.metadata('design:type', 'TestType');
        decorator(MyClass);

        const result = REFLECT.getMetadata('design:type', MyClass);
        expect(result).toBe('TestType');
    });

    it('should store and retrieve property-level metadata', () => {
        ReflectInitializer.init();

        class MyClass {}
        const decorator = REFLECT.metadata('design:type', String);
        decorator(MyClass.prototype, 'myProp');

        const result = REFLECT.getMetadata('design:type', MyClass.prototype, 'myProp');
        expect(result).toBe(String);
    });

    it('should return undefined for non-existent metadata', () => {
        ReflectInitializer.init();

        class MyClass {}
        const result = REFLECT.getMetadata('design:type', MyClass);
        expect(result).toBeUndefined();
    });

    it('should keep separate metadata per class', () => {
        ReflectInitializer.init();

        class ClassA {}
        class ClassB {}

        REFLECT.metadata('key', 'valueA')(ClassA);
        REFLECT.metadata('key', 'valueB')(ClassB);

        expect(REFLECT.getMetadata('key', ClassA)).toBe('valueA');
        expect(REFLECT.getMetadata('key', ClassB)).toBe('valueB');
    });

    it('should keep separate metadata per property', () => {
        ReflectInitializer.init();

        class MyClass {}
        REFLECT.metadata('type', 'string')(MyClass.prototype, 'prop1');
        REFLECT.metadata('type', 'number')(MyClass.prototype, 'prop2');

        expect(REFLECT.getMetadata('type', MyClass.prototype, 'prop1')).toBe('string');
        expect(REFLECT.getMetadata('type', MyClass.prototype, 'prop2')).toBe('number');
    });

    it('should not override existing Reflect.metadata', () => {
        const original = jest.fn();
        REFLECT.metadata = original;
        REFLECT.getMetadata = jest.fn();

        ReflectInitializer.init();
        expect(REFLECT.metadata).toBe(original);
    });

    it('should handle symbol property keys', () => {
        ReflectInitializer.init();

        class MyClass {}
        const sym = Symbol('mySymbol');
        REFLECT.metadata('key', 'value')(MyClass.prototype, sym);

        const result = REFLECT.getMetadata('key', MyClass.prototype, sym);
        expect(result).toBe('value');
    });

    describe('init timeout handling', () => {
        afterEach(() => {
            (ReflectInitializer as any)._initTimeout = undefined;
        });

        it('should clear previous timeout when calling init again', () => {
            const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
            (ReflectInitializer as any)._initTimeout = 99999;

            ReflectInitializer.init();

            expect(clearTimeoutSpy).toHaveBeenCalledWith(99999);
            clearTimeoutSpy.mockRestore();
        });

        it('should not call clearTimeout when _initTimeout is undefined', () => {
            const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
            (ReflectInitializer as any)._initTimeout = undefined;

            ReflectInitializer.init();

            expect(clearTimeoutSpy).not.toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('should reset _initTimeout to undefined after clearing', () => {
            (ReflectInitializer as any)._initTimeout = 12345;

            ReflectInitializer.init();

            // After init runs (with document available), the timeout state is cleared.
            expect((ReflectInitializer as any)._initTimeout).toBeUndefined();
        });

        it('should schedule a retry via setTimeout when document is undefined', () => {
            const isUndefinedSpy = jest.spyOn(Helpers, 'isUndefined').mockReturnValue(true);
            const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout').mockImplementation((() => 7777) as any);

            try {
                (ReflectInitializer as any)._initTimeout = undefined;
                ReflectInitializer.init();
                expect(setTimeoutSpy).toHaveBeenCalled();
                expect((ReflectInitializer as any)._initTimeout).toBe(7777);
            } finally {
                isUndefinedSpy.mockRestore();
                setTimeoutSpy.mockRestore();
                (ReflectInitializer as any)._initTimeout = undefined;
            }
        });
    });
});
