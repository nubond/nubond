import { Injectables } from '../../src/entities/Injectables';
import { Constants } from '../../src/Constants';
import { ReflectInitializer } from '../../src/initializers/ReflectInitializer';
import { ChangeDetector } from '../../src/models/injections/ChangeDetector';
import { EventDispatcher } from '../../src/models/injections/EventDispatcher';

//needed so that emitDecoratorMetadata's __metadata helper actually records 'design:paramtypes'
ReflectInitializer.init();

interface IMyConfig {
    apiUrl: string;
}

function Decorated(): (target: any) => any {
    return (target: any) => target;
}

describe('Injectables', () => {
    let injectables: Injectables;

    beforeEach(() => {
        injectables = new Injectables();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('register and resolve', () => {
        it('should register and resolve a simple class', () => {
            class MyService {}
            injectables.register(MyService as any, []);
            const instance = injectables.resolve(MyService as any);
            expect(instance).toBeInstanceOf(MyService);
        });

        it('should return new instance each time for transient (non-singleton)', () => {
            class MyService {}
            injectables.register(MyService as any, [], false);
            const a = injectables.resolve(MyService as any);
            const b = injectables.resolve(MyService as any);
            expect(a).not.toBe(b);
        });

        it('should return same instance for singleton', () => {
            class MyService {}
            injectables.register(MyService as any, [], true);
            const a = injectables.resolve(MyService as any);
            const b = injectables.resolve(MyService as any);
            expect(a).toBe(b);
        });

        it('should resolve with dependencies', () => {
            class DepService {}
            class MyService {
                constructor(public dep: DepService) {}
            }

            injectables.register(DepService as any, []);
            injectables.register(MyService as any, [DepService as any]);

            const instance = injectables.resolve(MyService as any) as MyService;
            expect(instance).toBeInstanceOf(MyService);
            expect(instance.dep).toBeInstanceOf(DepService);
        });

        it('should resolve nested dependencies', () => {
            class ServiceC {}
            class ServiceB {
                constructor(public c: ServiceC) {}
            }
            class ServiceA {
                constructor(public b: ServiceB) {}
            }

            injectables.register(ServiceC as any, []);
            injectables.register(ServiceB as any, [ServiceC as any]);
            injectables.register(ServiceA as any, [ServiceB as any]);

            const instance = injectables.resolve(ServiceA as any) as ServiceA;
            expect(instance).toBeInstanceOf(ServiceA);
            expect(instance.b).toBeInstanceOf(ServiceB);
            expect(instance.b.c).toBeInstanceOf(ServiceC);
        });

        it('should guard against direct circular dependencies without overflowing the stack', () => {
            class ServiceA {
                constructor(public b?: any) {}
            }
            class ServiceB {
                constructor(public a?: any) {}
            }

            injectables.register(ServiceA as any, [ServiceB as any]);
            injectables.register(ServiceB as any, [ServiceA as any]);

            let instance: ServiceA | undefined;
            expect(() => { instance = injectables.resolve(ServiceA as any) as ServiceA; }).not.toThrow();

            // A resolves; the inner B is built but its circular A dependency is soft-failed to undefined.
            expect(instance).toBeInstanceOf(ServiceA);
            expect(instance!.b).toBeInstanceOf(ServiceB);
            expect(instance!.b.a).toBeUndefined();

            //the first argument identifies the class whose resolution hit the cycle
            expect(console.error).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                ServiceB,
                expect.stringContaining('circular reference'),
                expect.stringContaining('ServiceA->ServiceB->ServiceA'),
            );
        });

        it('should guard against indirect (multi-hop) circular dependencies', () => {
            class ServiceX { constructor(public y?: any) {} }
            class ServiceY { constructor(public z?: any) {} }
            class ServiceZ { constructor(public x?: any) {} }

            injectables.register(ServiceX as any, [ServiceY as any]);
            injectables.register(ServiceY as any, [ServiceZ as any]);
            injectables.register(ServiceZ as any, [ServiceX as any]);

            let instance: ServiceX | undefined;
            expect(() => { instance = injectables.resolve(ServiceX as any) as ServiceX; }).not.toThrow();

            expect(instance).toBeInstanceOf(ServiceX);
            expect(instance!.y).toBeInstanceOf(ServiceY);
            expect(instance!.y.z).toBeInstanceOf(ServiceZ);
            // The hop that closes the cycle back to X is soft-failed.
            expect(instance!.y.z.x).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                ServiceZ,
                expect.stringContaining('circular reference'),
                expect.stringContaining('ServiceX->ServiceY->ServiceZ->ServiceX'),
            );
        });

        it('should still resolve a diamond (shared, non-circular) dependency', () => {
            class Shared {}
            class Left { constructor(public shared: Shared) {} }
            class Right { constructor(public shared: Shared) {} }
            class Root { constructor(public left: Left, public right: Right) {} }

            injectables.register(Shared as any, []);
            injectables.register(Left as any, [Shared as any]);
            injectables.register(Right as any, [Shared as any]);
            injectables.register(Root as any, [Left as any, Right as any]);

            const instance = injectables.resolve(Root as any) as Root;
            expect(instance).toBeInstanceOf(Root);
            expect(instance.left.shared).toBeInstanceOf(Shared);
            expect(instance.right.shared).toBeInstanceOf(Shared);
        });

        it('should log error for unknown injectable', () => {
            class Unknown {}
            const result = injectables.resolve(Unknown as any);
            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalled();
        });

        it('should log error on duplicate registration', () => {
            class MyService {}
            injectables.register(MyService as any, []);
            const noop = injectables.register(MyService as any, []);
            expect(console.error).toHaveBeenCalled();
            // Calling the no-op unregister should not throw
            expect(() => noop()).not.toThrow();
        });
    });

    describe('add (pre-built instance)', () => {
        it('should register a pre-built instance', () => {
            class MyService {
                value = 42;
            }
            const instance = new MyService();
            injectables.add(instance);
            const resolved = injectables.resolve(MyService as any) as MyService;
            expect(resolved).toBe(instance);
            expect(resolved.value).toBe(42);
        });

        it('should return unregister function', () => {
            class MyService {}
            const instance = new MyService();
            const unregister = injectables.add(instance);

            expect(injectables.resolve(MyService as any)).toBe(instance);

            unregister();
            const result = injectables.resolve(MyService as any);
            expect(result).toBeUndefined();
        });

        it('should log error for duplicate add', () => {
            class MyService {}
            injectables.add(new MyService());
            const noop = injectables.add(new MyService());
            expect(console.error).toHaveBeenCalled();
            // Calling the no-op unregister should not throw
            expect(() => noop()).not.toThrow();
        });
    });

    describe('register returns unregister function', () => {
        it('should unregister on calling returned function', () => {
            class MyService {}
            const unregister = injectables.register(MyService as any, []);

            expect(injectables.resolve(MyService as any)).toBeInstanceOf(MyService);

            unregister();
            const result = injectables.resolve(MyService as any);
            expect(result).toBeUndefined();
        });
    });

    describe('context-dependent injections', () => {
        it('should resolve context-dependent injections', () => {
            const element = document.createElement('div');

            class MyContext {
                constructor(public el: HTMLElement) {}
            }

            injectables.register(MyContext as any, [HTMLElement as any]);
            const instance = injectables.resolve(MyContext as any, element) as MyContext;
            expect(instance.el).toBe(element);
        });

        it('should push undefined and log error when no context injection matches the dependency type', () => {
            class SpecialDep {}
            class MyContext {
                constructor(public dep: SpecialDep | undefined) {}
            }

            injectables.register(MyContext as any, [SpecialDep as any]);

            const unrelatedObj = { unrelated: true };
            const instance = injectables.resolve(MyContext as any, unrelatedObj) as MyContext;

            expect(instance).toBeInstanceOf(MyContext);
            expect(instance.dep).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, MyContext, expect.stringContaining('SpecialDep'));
        });

        it('should fallback to HTMLElement.isPrototypeOf when custom element dependency not found directly', () => {
            // This tests the branch at line 96: when contextDependency is undefined and HTMLElement.isPrototypeOf(dependency)
            class CustomElement extends HTMLElement {}

            // Define custom element to make the class valid
            if (!customElements.get('test-inject-el')) {
                customElements.define('test-inject-el', CustomElement);
            }

            class MyContext {
                constructor(public el: CustomElement | undefined) {}
            }

            injectables.register(MyContext as any, [CustomElement as any]);

            const element = document.createElement('div');
            const instance = injectables.resolve(MyContext as any, element) as MyContext;

            // The HTMLElement fallback should find the div element
            expect(instance).toBeInstanceOf(MyContext);
            expect(instance.el).toBe(element);
        });

        it('should push undefined and error when dependency not registered and no context injections', () => {
            class UnknownDep {}
            class MyService {
                constructor(public dep: UnknownDep | undefined) {}
            }

            injectables.register(MyService as any, [UnknownDep as any]);

            const instance = injectables.resolve(MyService as any) as any;
            expect(instance).toBeInstanceOf(MyService);
            expect(instance!.dep).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, MyService, expect.stringContaining('UnknownDep'));
        });
    });

    describe('R3-4: interface-, any- or union-typed constructor params are not injected', () => {
        it('should emit Object as the paramtype for an interface-typed param', () => {
            @Decorated()
            class MyCtx {
                constructor(public config: IMyConfig) {}
            }

            expect((Reflect as any).getMetadata('design:paramtypes', MyCtx)).toEqual([Object]);
        });

        it('should emit Object as the paramtype for an any-typed param', () => {
            @Decorated()
            class MyCtx {
                constructor(public config: any) {}
            }

            expect((Reflect as any).getMetadata('design:paramtypes', MyCtx)).toEqual([Object]);
        });

        it('should inject undefined and log an error instead of the first context injection (app/container shape)', () => {
            @Decorated()
            class MyCtx {
                constructor(public config: IMyConfig) {}
            }

            const changeDetector = new ChangeDetector(() => {});
            const eventDispatcher = new EventDispatcher(document.createElement('div'));

            injectables.register(MyCtx as any, (Reflect as any).getMetadata('design:paramtypes', MyCtx));
            const instance = injectables.resolve(MyCtx as any, changeDetector, eventDispatcher) as MyCtx;

            expect(instance).toBeInstanceOf(MyCtx);
            expect(instance.config).toBeUndefined();
            expect(instance.config).not.toBeInstanceOf(ChangeDetector);
            //the message names the emitted paramtype ('Object'), so the consuming class
            //is only findable through the constructor passed as the first argument
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, MyCtx, expect.stringContaining('Object'));
        });

        it('should inject undefined and log an error instead of the host element (component shape)', () => {
            @Decorated()
            class MyComponentCtx {
                constructor(public config: IMyConfig) {}
            }

            const host = document.createElement('div');

            injectables.register(MyComponentCtx as any, (Reflect as any).getMetadata('design:paramtypes', MyComponentCtx));
            const instance = injectables.resolve(MyComponentCtx as any, host, new ChangeDetector(() => {})) as MyComponentCtx;

            expect(instance).toBeInstanceOf(MyComponentCtx);
            expect(instance.config).toBeUndefined();
            expect(instance.config).not.toBeInstanceOf(HTMLElement);
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, MyComponentCtx, expect.stringContaining('Object'));
        });

        it('should still resolve Object from the registry when it was registered explicitly', () => {
            class MyCtx {
                constructor(public dep: any) {}
            }

            //the guard sits on the context-dependant `else if`, so the registry branch still wins
            injectables.register(Object as any, []);
            injectables.register(MyCtx as any, [Object as any]);

            const instance = injectables.resolve(MyCtx as any, new ChangeDetector(() => {})) as MyCtx;

            expect(instance).toBeInstanceOf(MyCtx);
            expect(instance.dep).toBeInstanceOf(Object);
            expect(instance.dep).not.toBeInstanceOf(ChangeDetector);
        });

        it('should keep injecting concretely typed context dependencies', () => {
            class MyCtx {
                constructor(public cd: ChangeDetector) {}
            }

            const changeDetector = new ChangeDetector(() => {});
            injectables.register(MyCtx as any, [ChangeDetector as any]);
            const instance = injectables.resolve(MyCtx as any, changeDetector) as MyCtx;

            expect(instance.cd).toBe(changeDetector);
            expect(console.error).not.toHaveBeenCalled();
        });
    });
});
