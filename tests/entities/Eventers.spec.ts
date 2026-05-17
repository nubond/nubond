import { Eventers } from '../../src/entities/Eventers';

describe('Eventers', () => {
    let eventers: Eventers;

    beforeEach(() => {
        eventers = new Eventers();
    });

    it('should return false for has() on unknown target', () => {
        class MyClass {}
        expect(eventers.has(MyClass as any)).toBe(false);
    });

    it('should return undefined for get() on unknown target', () => {
        class MyClass {}
        expect(eventers.get(MyClass as any)).toBeUndefined();
    });

    it('should add an eventer and has() returns true', () => {
        class MyClass {}
        eventers.add(MyClass.prototype, 'click', 'onClick');
        expect(eventers.has(MyClass as any)).toBe(true);
    });

    it('should get the map of propertyName -> eventName', () => {
        class MyClass {}
        eventers.add(MyClass.prototype, 'click', 'onClick');
        eventers.add(MyClass.prototype, 'hover', 'onHover');

        const map = eventers.get(MyClass as any);
        expect(map).toBeDefined();
        expect(map!.get('onClick')).toBe('click');
        expect(map!.get('onHover')).toBe('hover');
    });

    it('should keep separate registries for different classes', () => {
        class ClassA {}
        class ClassB {}

        eventers.add(ClassA.prototype, 'click', 'onClick');
        eventers.add(ClassB.prototype, 'hover', 'onHover');

        expect(eventers.get(ClassA as any)!.size).toBe(1);
        expect(eventers.get(ClassB as any)!.size).toBe(1);
    });

    it('should accumulate multiple eventers on same target', () => {
        class MyClass {}
        eventers.add(MyClass.prototype, 'click', 'onClick');
        eventers.add(MyClass.prototype, 'hover', 'onHover');
        eventers.add(MyClass.prototype, 'focus', 'onFocus');

        const map = eventers.get(MyClass as any);
        expect(map!.size).toBe(3);
    });

    it('should overwrite if same property added again', () => {
        class MyClass {}
        eventers.add(MyClass.prototype, 'click', 'onClick');
        eventers.add(MyClass.prototype, 'dblclick', 'onClick');

        const map = eventers.get(MyClass as any);
        expect(map!.get('onClick')).toBe('dblclick');
    });
});
