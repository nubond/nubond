import { ContextBinder } from '../src/ContextBinder';
import { Environment } from '../src/Environment';
import { Container } from '../src/nElement/handlers/Container';

// An entity (nb-container / component) that sits on an element nobody can see is not
// committed: ContextedBase.commit() skips the entity block while the element is hidden
// and keeps the request owed, so the first commit that finds the element visible pays it.
//
// Two consequences are pinned here:
//  - an entity that does not exist yet is not instantiated until its element is first shown;
//  - an entity that already exists keeps living while hidden (change detection off) and a
//    name change / swap / emptying requested while it is hidden is applied on the next show,
//    not immediately (accepted trade-off: the old instance is held a bit longer, but nothing
//    is built or torn down for an element nobody can see).
describe('hidden entities are instantiated lazily', () => {
    let unique = 0;

    function createBinder(pessimistic: boolean = false): ContextBinder {
        return new ContextBinder(undefined, pessimistic, () => 'nb-hidden', undefined,
                                 () => false, () => undefined, () => undefined);
    }

    function nextCycle(binder: ContextBinder): void {
        binder.detectChanges();
        jest.runAllTimers();
    }

    // registers a container that counts its own constructions and disposals
    function countedContainer(html: string = '<span data-out nb-value="this.text"></span>'): { name: string; built: () => number; disposed: () => number; last: () => any } {
        const name = `LazyChild${unique++}`;
        let built = 0;
        let disposed = 0;
        let last: any;

        class Child {
            public text = 'v1';
            public label: string | undefined;

            constructor() {
                built++;
                last = this;
            }

            public onDispose(): void {
                disposed++;
            }
        }

        Environment.addContainer(name, Child as any, [], html, undefined);

        return { name, built: () => built, disposed: () => disposed, last: () => last };
    }

    function bind(html: string, host: object, pessimistic: boolean = false): { binder: ContextBinder; root: Element } {
        const root = document.createElement('div');
        root.innerHTML = html;
        document.body.appendChild(root);

        const binder = createBinder(pessimistic);
        binder.bind(root, host as any, true, false);
        jest.runAllTimers();

        return { binder, root };
    }

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        document.body.replaceChildren();
    });

    describe('nb-case', () => {
        it('should not instantiate the entity of a case the switch has not picked', () => {
            const one = countedContainer();
            const two = countedContainer();
            const three = countedContainer();

            bind(`<div nb-switch="this.tab">
                      <div nb-case="@one" nb-container="@${one.name}"></div>
                      <div nb-case="@two" nb-container="@${two.name}"></div>
                      <div nb-case="@three" nb-container="@${three.name}"></div>
                  </div>`, { tab: 'one' });

            expect(one.built()).toBe(1);
            expect(two.built()).toBe(0);
            expect(three.built()).toBe(0);
        });

        it('should instantiate it in the cycle that picks the case, and only once', () => {
            const one = countedContainer();
            const two = countedContainer();
            const host = { tab: 'one' };

            const { binder, root } = bind(`<div nb-switch="this.tab">
                                               <div nb-case="@one" nb-container="@${one.name}"></div>
                                               <div nb-case="@two" data-two nb-container="@${two.name}"></div>
                                           </div>`, host);

            host.tab = 'two';
            nextCycle(binder);

            expect(two.built()).toBe(1);
            expect(root.querySelector('[data-two] [data-out]')!.textContent).toBe('v1');

            host.tab = 'one';
            nextCycle(binder);
            host.tab = 'two';
            nextCycle(binder);

            expect(one.built()).toBe(1);
            expect(two.built()).toBe(1);
        });

        it('should keep an entity that was shown alive while its case is not picked, with change detection off', () => {
            const one = countedContainer();
            const two = countedContainer();
            const host = { tab: 'one' };

            const { binder } = bind(`<div nb-switch="this.tab">
                                         <div nb-case="@one" nb-container="@${one.name}"></div>
                                         <div nb-case="@two" nb-container="@${two.name}"></div>
                                     </div>`, host);

            const oneBinder = (binder.rootNElement as any)._children[0]._children[0]._disposeSequence.find((handler: any) => handler instanceof Container).contextBinder;

            expect(oneBinder.changeDetectionEnabled).toBe(true);

            host.tab = 'two';
            nextCycle(binder);

            expect(one.disposed()).toBe(0);
            expect(oneBinder.changeDetectionEnabled).toBe(false);

            host.tab = 'one';
            nextCycle(binder);

            expect(one.built()).toBe(1);
            expect(oneBinder.changeDetectionEnabled).toBe(true);
        });

        it('should deliver nb-in values that changed while the entity did not exist yet', () => {
            const one = countedContainer();
            const two = countedContainer('<span data-out nb-value="this.label"></span>');
            const host = { tab: 'one', label: 'first' };

            const { binder, root } = bind(`<div nb-switch="this.tab">
                                               <div nb-case="@one" nb-container="@${one.name}"></div>
                                               <div nb-case="@two" data-two nb-container="@${two.name}" nb-in:label="this.label"></div>
                                           </div>`, host);

            host.label = 'second';
            nextCycle(binder);

            expect(two.built()).toBe(0);

            host.tab = 'two';
            nextCycle(binder);
            jest.runAllTimers();

            expect(two.last().label).toBe('second');
            expect(root.querySelector('[data-two] [data-out]')!.textContent).toBe('second');
        });
    });

    describe('nb-default', () => {
        it('should not instantiate the entity of a default while a case matches', () => {
            const one = countedContainer();
            const fallback = countedContainer();
            const host = { tab: 'one' };

            const { binder } = bind(`<div nb-switch="this.tab">
                                         <div nb-case="@one" nb-container="@${one.name}"></div>
                                         <div nb-default nb-container="@${fallback.name}"></div>
                                     </div>`, host);

            expect(fallback.built()).toBe(0);

            host.tab = 'nothing-matches';
            nextCycle(binder);

            expect(fallback.built()).toBe(1);
        });
    });

    describe('nb-if on the entity element itself', () => {
        it('should not instantiate while the condition has never been true', () => {
            const child = countedContainer();
            const host = { show: false };

            const { binder, root } = bind(`<div nb-if="this.show" data-host nb-container="@${child.name}"></div>`, host);

            expect(child.built()).toBe(0);
            expect(root.querySelector('[data-host]')!.childNodes.length).toBe(0);

            nextCycle(binder);
            nextCycle(binder);

            expect(child.built()).toBe(0);

            host.show = true;
            nextCycle(binder);

            expect(child.built()).toBe(1);
            expect(root.querySelector('[data-host] [data-out]')!.textContent).toBe('v1');
        });

        it('should keep the entity once it was shown, and not build a second one', () => {
            const child = countedContainer();
            const host = { show: true };

            const { binder } = bind(`<div nb-if="this.show" nb-container="@${child.name}"></div>`, host);

            host.show = false;
            nextCycle(binder);
            host.show = true;
            nextCycle(binder);

            expect(child.built()).toBe(1);
            expect(child.disposed()).toBe(0);
        });

        it('should not mark the container as ready before it is first shown', () => {
            const child = countedContainer();
            const host = { show: false };

            const { binder, root } = bind(`<div nb-if="this.show" data-host nb-container="@${child.name}"></div>`, host);

            expect(root.querySelector('[data-host]')!.hasAttribute('nb-container-ready')).toBe(false);

            host.show = true;
            nextCycle(binder);

            expect(root.querySelector('[data-host]')!.hasAttribute('nb-container-ready')).toBe(true);
        });

        it('should dispose nothing when the element is removed before it was ever shown', () => {
            const child = countedContainer();
            const host = { show: false };

            const { binder } = bind(`<div nb-if="this.show" nb-container="@${child.name}"></div>`, host);

            expect(() => binder.dispose()).not.toThrow();
            expect(child.built()).toBe(0);
            expect(child.disposed()).toBe(0);
        });
    });

    describe('nb-repeat on the entity element itself', () => {
        it('should not instantiate a phantom row for an empty collection', () => {
            const row = countedContainer();
            const host: { rows: Array<number> } = { rows: [] };

            const { binder } = bind(`<div nb-repeat="this.rows" nb-container="@${row.name}"></div>`, host);

            expect(row.built()).toBe(0);

            host.rows = [1, 2, 3];
            nextCycle(binder);

            expect(row.built()).toBe(3);
        });
    });

    describe('a hidden ancestor (already lazy before the change)', () => {
        it('should not instantiate under an element whose nb-if is false', () => {
            const child = countedContainer();
            const host = { show: false };

            const { binder } = bind(`<div nb-if="this.show"><div nb-container="@${child.name}"></div></div>`, host);

            expect(child.built()).toBe(0);

            host.show = true;
            nextCycle(binder);

            expect(child.built()).toBe(1);
        });
    });

    describe('onContainerAttached of the host', () => {
        it('should fire on first show, not while the container is hidden', () => {
            const child = countedContainer();
            const attached: Array<object> = [];
            const host = {
                show: false,
                onContainerAttached(context: object): void {
                    attached.push(context);
                }
            };

            const { binder } = bind(`<div nb-if="this.show" nb-container="@${child.name}"></div>`, host);

            expect(attached.length).toBe(0);

            host.show = true;
            nextCycle(binder);

            expect(attached).toEqual([child.last()]);
        });
    });

    describe('the name changing before the entity exists', () => {
        it('should build only the entity named when the element is finally shown', () => {
            const first = countedContainer();
            const second = countedContainer();
            const host = { show: false, view: first.name };

            const { binder } = bind('<div nb-if="this.show" nb-container="this.view"></div>', host);

            host.view = second.name;
            nextCycle(binder);
            host.show = true;
            nextCycle(binder);

            expect(first.built()).toBe(0);
            expect(second.built()).toBe(1);
        });

        it('should build nothing when the name is emptied before the first show', () => {
            const child = countedContainer();
            const host = { show: false, view: child.name };

            const { binder, root } = bind('<div nb-if="this.show" data-host nb-container="this.view"></div>', host);

            host.view = '';
            nextCycle(binder);
            host.show = true;
            nextCycle(binder);

            expect(child.built()).toBe(0);
            expect(root.querySelector('[data-host]')!.childNodes.length).toBe(0);
        });
    });

    // an entity that was shown once: requests made while it is hidden are owed until the next show
    describe('an existing entity while it is hidden', () => {
        it('should defer a swap until the element is shown again', () => {
            const first = countedContainer();
            const second = countedContainer('<span data-out>second</span>');
            const host = { show: true, view: first.name };

            const { binder, root } = bind('<div nb-if="this.show" data-host nb-container="this.view"></div>', host);

            host.show = false;
            nextCycle(binder);
            host.view = second.name;
            nextCycle(binder);
            nextCycle(binder);

            expect(first.disposed()).toBe(0);
            expect(second.built()).toBe(0);
            expect(root.querySelector('[data-host] [data-out]')!.textContent).toBe('v1');

            host.show = true;
            nextCycle(binder);

            expect(first.disposed()).toBe(1);
            expect(second.built()).toBe(1);
            expect(root.querySelector('[data-host] [data-out]')!.textContent).toBe('second');
        });

        it('should defer an emptying until the element is shown again', () => {
            const child = countedContainer();
            const host = { show: true, view: child.name };

            const { binder, root } = bind('<div nb-if="this.show" data-host nb-container="this.view"></div>', host);

            host.show = false;
            host.view = '';
            nextCycle(binder);
            nextCycle(binder);

            expect(child.disposed()).toBe(0);
            expect(root.querySelector('[data-host] [data-out]')).not.toBeNull();

            host.show = true;
            nextCycle(binder);

            expect(child.disposed()).toBe(1);
            expect(child.built()).toBe(1);
        });

        it('should keep the same instance when it is emptied while hidden and shown again under the same name', () => {
            const child = countedContainer();
            const host = { show: true, view: child.name };

            const { binder } = bind('<div nb-if="this.show" nb-container="this.view"></div>', host);

            const instance = child.last();
            instance.text = 'kept';

            host.show = false;
            host.view = '';
            nextCycle(binder);

            host.view = child.name;
            host.show = true;
            nextCycle(binder);

            expect(child.built()).toBe(1);
            expect(child.disposed()).toBe(0);
            expect(child.last()).toBe(instance);
            expect(instance.text).toBe('kept');
        });

        it('should build nothing for a name that came and went while hidden', () => {
            const first = countedContainer();
            const second = countedContainer();
            const host = { show: true, view: first.name };

            const { binder } = bind('<div nb-if="this.show" nb-container="this.view"></div>', host);

            host.show = false;
            nextCycle(binder);
            host.view = second.name;
            nextCycle(binder);
            host.view = first.name;
            nextCycle(binder);
            host.show = true;
            nextCycle(binder);

            expect(first.built()).toBe(1);
            expect(first.disposed()).toBe(0);
            expect(second.built()).toBe(0);
        });

        it('should fire onContainerDetached / onContainerAttached of the host on the show that pays the swap', () => {
            const first = countedContainer();
            const second = countedContainer();
            const attached: Array<object> = [];
            const detached: Array<object> = [];
            const host = {
                show: true,
                view: first.name,
                onContainerAttached(context: object): void {
                    attached.push(context);
                },
                onContainerDetached(context: object): void {
                    detached.push(context);
                }
            };

            const { binder } = bind('<div nb-if="this.show" nb-container="this.view"></div>', host);

            const firstInstance = first.last();

            host.show = false;
            nextCycle(binder);
            host.view = second.name;
            nextCycle(binder);

            expect(attached).toEqual([firstInstance]);
            expect(detached).toEqual([]);

            host.show = true;
            nextCycle(binder);

            expect(detached).toEqual([firstInstance]);
            expect(attached).toEqual([firstInstance, second.last()]);
        });

        it('should defer a swap of a case that is not picked', () => {
            const one = countedContainer();
            const first = countedContainer();
            const second = countedContainer();
            const host = { tab: 'two', view: first.name };

            const { binder } = bind(`<div nb-switch="this.tab">
                                         <div nb-case="@one" nb-container="@${one.name}"></div>
                                         <div nb-case="@two" nb-container="this.view"></div>
                                     </div>`, host);

            host.tab = 'one';
            nextCycle(binder);
            host.view = second.name;
            nextCycle(binder);

            expect(first.disposed()).toBe(0);
            expect(second.built()).toBe(0);

            host.tab = 'two';
            nextCycle(binder);

            expect(first.disposed()).toBe(1);
            expect(second.built()).toBe(1);
        });

        it('should defer a route slot change until the element is shown again', () => {
            const first = countedContainer();
            const second = countedContainer();
            const host = { show: true };

            const routerDescriptor = Object.getOwnPropertyDescriptor(Environment, 'router')!;
            let onAfterStateChange: () => void = () => undefined;
            const router = {
                isConfigured: true,
                state: <{ [key: string]: string }>{ main: first.name },
                onAfterStateChange: (callBack: () => void) => {
                    onAfterStateChange = callBack;
                    return () => undefined;
                }
            };
            Object.defineProperty(Environment, 'router', { get: () => router, configurable: true });

            try {
                const { binder } = bind('<div nb-if="this.show" nb-container="%main"></div>', host);

                expect(first.built()).toBe(1);

                host.show = false;
                nextCycle(binder);

                router.state = { main: second.name };
                onAfterStateChange();
                jest.runAllTimers();

                expect(first.disposed()).toBe(0);
                expect(second.built()).toBe(0);

                host.show = true;
                nextCycle(binder);

                expect(first.disposed()).toBe(1);
                expect(second.built()).toBe(1);
            } finally {
                Object.defineProperty(Environment, 'router', routerDescriptor);
            }
        });

        it('should still swap immediately while the element is visible', () => {
            const first = countedContainer();
            const second = countedContainer();
            const host = { show: true, view: first.name };

            const { binder } = bind('<div nb-if="this.show" nb-container="this.view"></div>', host);

            host.view = second.name;
            nextCycle(binder);

            expect(first.disposed()).toBe(1);
            expect(second.built()).toBe(1);
        });
    });

    describe('pessimistic change detection', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        it('should stabilize with a build still owed, and pay it on show', () => {
            const child = countedContainer();
            const host = { show: false };

            const { binder, root } = bind(`<div nb-if="this.show" data-host nb-container="@${child.name}"></div>`, host, true);

            nextCycle(binder);
            nextCycle(binder);

            expect(child.built()).toBe(0);

            host.show = true;
            nextCycle(binder);

            expect(child.built()).toBe(1);
            expect(root.querySelector('[data-host] [data-out]')!.textContent).toBe('v1');
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should not instantiate the entity of a case the switch has not picked', () => {
            const one = countedContainer();
            const two = countedContainer();
            const host = { tab: 'one' };

            const { binder } = bind(`<div nb-switch="this.tab">
                                         <div nb-case="@one" nb-container="@${one.name}"></div>
                                         <div nb-case="@two" nb-container="@${two.name}"></div>
                                     </div>`, host, true);

            expect(one.built()).toBe(1);
            expect(two.built()).toBe(0);

            host.tab = 'two';
            nextCycle(binder);

            expect(two.built()).toBe(1);
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should stabilize with a swap still owed, and pay it on show', () => {
            const first = countedContainer();
            const second = countedContainer();
            const host = { show: true, view: first.name };

            const { binder } = bind('<div nb-if="this.show" nb-container="this.view"></div>', host, true);

            host.show = false;
            host.view = second.name;
            nextCycle(binder);

            expect(first.disposed()).toBe(0);
            expect(second.built()).toBe(0);

            host.show = true;
            nextCycle(binder);

            expect(first.disposed()).toBe(1);
            expect(second.built()).toBe(1);
            expect(errorSpy).not.toHaveBeenCalled();
        });
    });

    describe('components', () => {
        function countedComponent(): { tag: string; built: () => number } {
            const tag = `lazy-comp-${unique++}`;
            let built = 0;

            class Comp {
                public text = 'c1';

                constructor() {
                    built++;
                }
            }

            Environment.addComponent(tag, Comp as any, [], undefined, '<span nb-value="this.text"></span>', undefined, undefined, undefined);

            return { tag, built: () => built };
        }

        it('should not instantiate a component whose own nb-if has never been true', () => {
            const comp = countedComponent();
            const host = { show: false };

            const { binder, root } = bind(`<${comp.tag} nb-if="this.show"></${comp.tag}>`, host);

            expect(comp.built()).toBe(0);
            expect(root.querySelector(comp.tag)!.hasAttribute('nb-component')).toBe(false);

            host.show = true;
            nextCycle(binder);

            expect(comp.built()).toBe(1);
            expect(root.querySelector(comp.tag)!.hasAttribute('nb-component')).toBe(true);
        });

        it('should keep a component that was shown, and not build a second one', () => {
            const comp = countedComponent();
            const host = { show: true };

            const { binder } = bind(`<${comp.tag} nb-if="this.show"></${comp.tag}>`, host);

            host.show = false;
            nextCycle(binder);
            host.show = true;
            nextCycle(binder);

            expect(comp.built()).toBe(1);
        });

        it('should not instantiate the component of a case the switch has not picked', () => {
            const one = countedComponent();
            const two = countedComponent();
            const host = { tab: 'one' };

            const { binder } = bind(`<div nb-switch="this.tab">
                                         <${one.tag} nb-case="@one"></${one.tag}>
                                         <${two.tag} nb-case="@two"></${two.tag}>
                                     </div>`, host);

            expect(one.built()).toBe(1);
            expect(two.built()).toBe(0);

            host.tab = 'two';
            nextCycle(binder);

            expect(one.built()).toBe(1);
            expect(two.built()).toBe(1);
        });

        it('should not instantiate a phantom component for an empty nb-repeat', () => {
            const comp = countedComponent();
            const host: { rows: Array<number> } = { rows: [] };

            const { binder } = bind(`<${comp.tag} nb-repeat="this.rows"></${comp.tag}>`, host);

            expect(comp.built()).toBe(0);

            host.rows = [1, 2];
            nextCycle(binder);

            expect(comp.built()).toBe(2);
        });
    });
});
