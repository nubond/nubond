import { Detectors } from '../../src/entities/Detectors';

describe('Detectors', () => {
    let detectors: Detectors;

    beforeEach(() => {
        detectors = new Detectors();
    });

    it('should return false for has() on unknown target', () => {
        class MyClass {}
        expect(detectors.has(MyClass as any)).toBe(false);
    });

    it('should return undefined for get() on unknown target', () => {
        class MyClass {}
        expect(detectors.get(MyClass as any)).toBeUndefined();
    });

    it('should add a detector property and has() returns true', () => {
        class MyClass {}
        detectors.add(MyClass.prototype, 'myProp');
        expect(detectors.has(MyClass as any)).toBe(true);
    });

    it('should get the set of property names', () => {
        class MyClass {}
        detectors.add(MyClass.prototype, 'prop1');
        detectors.add(MyClass.prototype, 'prop2');

        const props = detectors.get(MyClass as any);
        expect(props).toEqual(new Set(['prop1', 'prop2']));
    });

    it('should keep separate registries for different classes', () => {
        class ClassA {}
        class ClassB {}

        detectors.add(ClassA.prototype, 'propA');
        detectors.add(ClassB.prototype, 'propB');

        expect(detectors.get(ClassA as any)).toEqual(new Set(['propA']));
        expect(detectors.get(ClassB as any)).toEqual(new Set(['propB']));
    });

    it('should accumulate multiple properties on same target', () => {
        class MyClass {}
        detectors.add(MyClass.prototype, 'a');
        detectors.add(MyClass.prototype, 'b');
        detectors.add(MyClass.prototype, 'c');

        expect(detectors.get(MyClass as any)).toEqual(new Set(['a', 'b', 'c']));
    });

    // L-44: a property decorated twice used to be registered twice, so the binder's second pass
    // found the accessor installed by the first and logged 'has getter or setter' once per instance.
    it('should register a property added twice only once (L-44)', () => {
        class MyClass {}
        detectors.add(MyClass.prototype, 'a');
        detectors.add(MyClass.prototype, 'b');
        detectors.add(MyClass.prototype, 'a');

        expect(Array.from(detectors.get(MyClass as any)!)).toEqual(['a', 'b']);
    });

    // Documented by-design limitation (see the @Detector() JSDoc): registration keys on the exact
    // prototype the decorator ran against, and lookup keys on the concrete class's own prototype, so
    // a base class's detectors are NOT inherited. Pinned here so the behaviour stays deliberate.
    describe('inheritance is not supported (by design)', () => {
        it('should not see a base class detector from a derived class', () => {
            class Base {}
            class Derived extends Base {}

            detectors.add(Base.prototype, 'baseProp');

            expect(detectors.get(Base as any)).toEqual(new Set(['baseProp']));
            expect(detectors.get(Derived as any)).toBeUndefined();
            expect(detectors.has(Derived as any)).toBe(false);
        });

        it('should expose only the derived class own detectors when both are decorated', () => {
            class Base {}
            class Derived extends Base {}

            detectors.add(Base.prototype, 'baseProp');
            detectors.add(Derived.prototype, 'derivedProp');

            expect(detectors.get(Derived as any)).toEqual(new Set(['derivedProp']));
        });
    });
});
