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

    it('should get the array of property names', () => {
        class MyClass {}
        detectors.add(MyClass.prototype, 'prop1');
        detectors.add(MyClass.prototype, 'prop2');

        const props = detectors.get(MyClass as any);
        expect(props).toEqual(['prop1', 'prop2']);
    });

    it('should keep separate registries for different classes', () => {
        class ClassA {}
        class ClassB {}

        detectors.add(ClassA.prototype, 'propA');
        detectors.add(ClassB.prototype, 'propB');

        expect(detectors.get(ClassA as any)).toEqual(['propA']);
        expect(detectors.get(ClassB as any)).toEqual(['propB']);
    });

    it('should accumulate multiple properties on same target', () => {
        class MyClass {}
        detectors.add(MyClass.prototype, 'a');
        detectors.add(MyClass.prototype, 'b');
        detectors.add(MyClass.prototype, 'c');

        expect(detectors.get(MyClass as any)).toEqual(['a', 'b', 'c']);
    });
});
