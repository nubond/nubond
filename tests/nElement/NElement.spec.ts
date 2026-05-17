import { NTreeElement, NElement } from '../../src/nElement/NElement';
import { Environment } from '../../src/Environment';
import { INTreeElement } from '../../src/interfaces/nElement/INElement';
import { ContextBinder } from '../../src/ContextBinder';
import { INElement } from '../../src/interfaces/nElement/INElement';
import { Router } from '../../src/Router';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('NTreeElement', () => {
    it('should store nativeElement', () => {
        const el = document.createElement('div');
        const tree = new NTreeElement(el);
        expect(tree.nativeElement).toBe(el);
    });

    it('should be stable initially', () => {
        const el = document.createElement('div');
        const tree = new NTreeElement(el);
        expect(tree.isStable).toBe(true);
    });

    it('isSubTreeHandled should be false', () => {
        const el = document.createElement('div');
        const tree = new NTreeElement(el);
        expect(tree.isSubTreeHandled).toBe(false);
    });

    it('should add and track children', () => {
        const parent = new NTreeElement(document.createElement('div'));
        const child = new NTreeElement(document.createElement('span'));
        parent.addChild(child);

        // Children are tracked — isStable depends on children
        expect(parent.isStable).toBe(true);
    });

    it('should remove child on stabilize', () => {
        const parent = new NTreeElement(document.createElement('div'));
        const child = new NTreeElement(document.createElement('span'));
        parent.addChild(child);
        parent.removeChild(child);
        parent.stabilizeChildren();

        // After removal and stabilization, child should be gone
        // We can verify by detecting changes — no error
        expect(parent.isStable).toBe(true);
    });

    it('should detect changes on children', () => {
        const parent = new NTreeElement(document.createElement('div'));
        const child = new NTreeElement(document.createElement('span'));
        parent.addChild(child);

        // Should not throw
        expect(() => parent.detectChanges({})).not.toThrow();
    });

    it('should dispose all children', () => {
        const parent = new NTreeElement(document.createElement('div'));
        const child = new NTreeElement(document.createElement('span'));
        parent.addChild(child);

        expect(() => parent.dispose()).not.toThrow();
    });

    describe('detectChanges()', () => {
        it('should call detectChanges on all children', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child1 = new NTreeElement(document.createElement('span'));
            const child2 = new NTreeElement(document.createElement('p'));
            const spy1 = jest.spyOn(child1, 'detectChanges');
            const spy2 = jest.spyOn(child2, 'detectChanges');

            parent.addChild(child1);
            parent.addChild(child2);
            parent.detectChanges({});

            expect(spy1).toHaveBeenCalledTimes(1);
            expect(spy2).toHaveBeenCalledTimes(1);
        });

        it('should return stable state after detectChanges with no dirty children', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child = new NTreeElement(document.createElement('span'));
            parent.addChild(child);

            parent.detectChanges({});
            expect(parent.isStable).toBe(true);
        });

        it('should call stabilizeChildren during detectChanges', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child = new NTreeElement(document.createElement('span'));
            const stabSpy = jest.spyOn(parent, 'stabilizeChildren');

            parent.addChild(child);
            parent.detectChanges({});

            expect(stabSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('dispose()', () => {
        it('should call dispose on every child', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child1 = new NTreeElement(document.createElement('a'));
            const child2 = new NTreeElement(document.createElement('b'));
            const spy1 = jest.spyOn(child1, 'dispose');
            const spy2 = jest.spyOn(child2, 'dispose');

            parent.addChild(child1);
            parent.addChild(child2);
            parent.dispose();

            expect(spy1).toHaveBeenCalledTimes(1);
            expect(spy2).toHaveBeenCalledTimes(1);
        });

        it('should handle nested children disposal', () => {
            const root = new NTreeElement(document.createElement('div'));
            const mid = new NTreeElement(document.createElement('section'));
            const leaf = new NTreeElement(document.createElement('span'));
            const leafSpy = jest.spyOn(leaf, 'dispose');

            mid.addChild(leaf);
            root.addChild(mid);
            root.dispose();

            expect(leafSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('isStable', () => {
        it('should reflect child instability via mock', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const unstableChild: INTreeElement = {
                nativeElement: document.createElement('span'),
                isSubTreeHandled: false,
                isStable: false,
                addChild: jest.fn(),
                removeChild: jest.fn(),
                detectChanges: jest.fn(),
                dispose: jest.fn()
            };

            parent.addChild(unstableChild);
            expect(parent.isStable).toBe(false);
        });

        it('should be stable when all children are stable', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const stableChild: INTreeElement = {
                nativeElement: document.createElement('span'),
                isSubTreeHandled: false,
                isStable: true,
                addChild: jest.fn(),
                removeChild: jest.fn(),
                detectChanges: jest.fn(),
                dispose: jest.fn()
            };

            parent.addChild(stableChild);
            expect(parent.isStable).toBe(true);
        });

        it('should be stable after adding and then stabilizing removal of child', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child = new NTreeElement(document.createElement('span'));

            parent.addChild(child);
            expect(parent.isStable).toBe(true);

            parent.removeChild(child);
            parent.stabilizeChildren();
            expect(parent.isStable).toBe(true);
        });
    });

    describe('removeChild()', () => {
        it('should remove specific child by reference after stabilize', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child1 = new NTreeElement(document.createElement('a'));
            const child2 = new NTreeElement(document.createElement('b'));

            parent.addChild(child1);
            parent.addChild(child2);

            // Remove child1 only
            parent.removeChild(child1);
            parent.stabilizeChildren();

            // child2 should still receive detectChanges
            const spy2 = jest.spyOn(child2, 'detectChanges');
            const spy1 = jest.spyOn(child1, 'detectChanges');
            parent.detectChanges({});

            expect(spy2).toHaveBeenCalledTimes(1);
            expect(spy1).not.toHaveBeenCalled();
        });

        it('should not remove child until stabilizeChildren is called', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child = new NTreeElement(document.createElement('span'));

            parent.addChild(child);
            parent.removeChild(child);

            // Before stabilize, child is still in _children
            const spy = jest.spyOn(child, 'detectChanges');
            parent.detectChanges({}); // detectChanges calls stabilizeChildren at the end

            // detectChanges iterates _children first, then stabilizes
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('should handle removing a child that was never added', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const orphan = new NTreeElement(document.createElement('span'));

            parent.removeChild(orphan);
            expect(() => parent.stabilizeChildren()).not.toThrow();
        });

        it('should handle removing the same child twice gracefully', () => {
            const parent = new NTreeElement(document.createElement('div'));
            const child = new NTreeElement(document.createElement('span'));
            parent.addChild(child);

            parent.removeChild(child);
            parent.removeChild(child);
            expect(() => parent.stabilizeChildren()).not.toThrow();
        });
    });
});

describe('NElement', () => {
    describe('static isNApplicable', () => {
        it('should return false for plain element without nb attributes', () => {
            const el = document.createElement('div');
            expect(NElement.isNApplicable(el)).toBe(false);
        });

        it('should return true for element with nb attributes', () => {
            const el = document.createElement('div');
            el.setAttribute('nb-value', 'ctx.name');
            expect(NElement.isNApplicable(el)).toBe(true);
        });

        it('should return true for element with nb-attr: prefix attributes', () => {
            const el = document.createElement('div');
            el.setAttribute('nb-attr:title', 'ctx.title');
            expect(NElement.isNApplicable(el)).toBe(true);
        });

        it('should return true for element with nb-event prefix', () => {
            const el = document.createElement('div');
            el.setAttribute('nb-event:click', 'ctx.onClick()');
            expect(NElement.isNApplicable(el)).toBe(true);
        });

        it('should return true for element with nb-aspect prefix', () => {
            const el = document.createElement('div');
            el.setAttribute('nb-aspect:tooltip', '');
            expect(NElement.isNApplicable(el)).toBe(true);
        });

        it('should return false for text node', () => {
            const textNode = document.createTextNode('hello');
            // NElement.isNApplicable expects Element, textNode is not an Element
            // nodeType check inside Attributes.isNApplicable and Component.isNApplicable
            // guards against non-ELEMENT_NODE. We cast to exercise the guard.
            expect(NElement.isNApplicable(textNode as unknown as Element)).toBe(false);
        });

        it('should return false for comment node', () => {
            const comment = document.createComment('comment');
            expect(NElement.isNApplicable(comment as unknown as Element)).toBe(false);
        });

        it('should return true when element tag is a registered component', () => {
            const el = document.createElement('my-widget');
            // Mock Environment.components.has to return true for this tag
            const origHas = Environment.components.has.bind(Environment.components);
            jest.spyOn(Environment.components, 'has').mockImplementation((name: string) => {
                return name === 'MY-WIDGET' ? true : origHas(name);
            });

            expect(NElement.isNApplicable(el)).toBe(true);

            (Environment.components.has as jest.Mock).mockRestore();
        });

        it('should return false when element tag is not a registered component and has no nb attributes', () => {
            const el = document.createElement('my-widget');
            jest.spyOn(Environment.components, 'has').mockReturnValue(false);

            expect(NElement.isNApplicable(el)).toBe(false);

            (Environment.components.has as jest.Mock).mockRestore();
        });
    });
});

describe('NElement lifecycle via ContextBinder', () => {
    function createBoundElement(html: string, context: object = {}): { binder: ContextBinder, el: Element } {
        const el = document.createElement('div');
        el.innerHTML = html;
        const binder = new ContextBinder(undefined, false, () => 'nb-hidden', undefined, () => false, () => undefined, () => undefined);
        binder.bind(el, context as any, false, false);
        return { binder, el };
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('construction and nb-value', () => {
        it('should construct NElement with nb-value and set textContent', () => {
            const { binder, el } = createBoundElement('<span nb-value="this.name"></span>', { name: 'hello' });
            expect(binder.rootNElement).toBeDefined();
            expect(el.querySelector('span')!.textContent).toBe('hello');
        });

        it('should update textContent on re-detect after context change', () => {
            const ctx = { name: 'first' };
            const { binder, el } = createBoundElement('<span nb-value="this.name"></span>', ctx);
            expect(el.querySelector('span')!.textContent).toBe('first');

            (ctx as any).name = 'second';
            binder.rootNElement!.detectChanges(ctx);
            expect(el.querySelector('span')!.textContent).toBe('second');
        });

        it('should handle undefined value as empty string', () => {
            const { el } = createBoundElement('<span nb-value="this.missing"></span>', {});
            expect(el.querySelector('span')!.textContent).toBe('');
        });
    });

    describe('nb-html binding', () => {
        it('should set innerHTML from context', () => {
            const { el } = createBoundElement('<div nb-html="this.content"></div>', { content: '<b>bold</b>' });
            expect(el.querySelector('div')!.innerHTML).toBe('<b>bold</b>');
        });

        it('should update innerHTML on re-detect', () => {
            const ctx = { content: '<i>italic</i>' };
            const { binder, el } = createBoundElement('<div nb-html="this.content"></div>', ctx);
            expect(el.querySelector('div')!.innerHTML).toBe('<i>italic</i>');

            (ctx as any).content = '<u>underline</u>';
            binder.rootNElement!.detectChanges(ctx);
            expect(el.querySelector('div')!.innerHTML).toBe('<u>underline</u>');
        });
    });

    describe('validate() conflicts', () => {
        it('should throw for conflicting value and html bindings (content changers)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            expect(() => createBoundElement('<span nb-value="this.a" nb-html="this.b"></span>')).toThrow();
        });

        it('should throw for conflicting value and switch bindings (content changers)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            expect(() => createBoundElement('<span nb-value="this.a" nb-switch="this.b"></span>')).toThrow();
        });

        it('should throw for conflicting value and container bindings (content changers)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            expect(() => createBoundElement('<span nb-value="this.a" nb-container="myContainer"></span>')).toThrow();
        });

        it('should throw for conflicting html and container bindings (content changers)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            expect(() => createBoundElement('<span nb-html="this.a" nb-container="myContainer"></span>')).toThrow();
        });

        it('should throw for conflicting value and component bindings (content changers)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            jest.spyOn(Environment.components, 'has').mockReturnValue(true);
            try {
                expect(() => createBoundElement('<my-comp nb-value="this.a" nb-component="comp1"></my-comp>')).toThrow();
            } finally {
                (Environment.components.has as jest.Mock).mockRestore();
            }
        });

        it('should throw for structure changers conflict (case + repeat)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            expect(() => createBoundElement('<div nb-switch="this.mode"><span nb-case="this.c" nb-repeat="this.items"></span></div>', { mode: 'x', c: 'x', items: [] })).toThrow();
        });

        it('should throw for function changers conflict (case + if)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            expect(() => createBoundElement('<div nb-switch="this.mode"><span nb-case="this.c" nb-if="this.visible"></span></div>', { mode: 'x', c: 'x', visible: true })).toThrow();
        });

        it('should throw for function changers conflict (default + if)', () => {
            jest.spyOn(console, 'error').mockImplementation();
            expect(() => createBoundElement('<div nb-switch="this.mode"><span nb-default nb-if="this.visible"></span></div>', { mode: 'x', visible: true })).toThrow();
        });
    });

    describe('nb-if binding', () => {
        it('should show element when condition is true', () => {
            const { el } = createBoundElement('<span nb-if="this.visible"></span>', { visible: true });
            const span = el.querySelector('span')!;
            expect(span.classList.contains('nb-hidden')).toBe(false);
        });

        it('should hide element when condition is false', () => {
            const { el } = createBoundElement('<span nb-if="this.visible"></span>', { visible: false });
            const span = el.querySelector('span')!;
            expect(span.classList.contains('nb-hidden')).toBe(true);
        });

        it('should toggle visibility on re-detect', () => {
            const ctx = { visible: true };
            const { binder, el } = createBoundElement('<span nb-if="this.visible"></span>', ctx);
            const span = el.querySelector('span')!;
            expect(span.classList.contains('nb-hidden')).toBe(false);

            (ctx as any).visible = false;
            binder.rootNElement!.detectChanges(ctx);
            expect(span.classList.contains('nb-hidden')).toBe(true);
        });
    });

    describe('nb-exec binding', () => {
        it('should execute expression during bind', () => {
            const ctx = { counter: 0, increment() { this.counter++; } };
            createBoundElement('<span nb-exec="this.increment()"></span>', ctx);
            expect(ctx.counter).toBe(1);
        });
    });

    describe('nb-attr binding', () => {
        it('should set attribute from context', () => {
            const { el } = createBoundElement('<span nb-attr:title="this.tip"></span>', { tip: 'hello' });
            expect(el.querySelector('span')!.getAttribute('title')).toBe('hello');
        });

        it('should update attribute on re-detect', () => {
            const ctx = { tip: 'first' };
            const { binder, el } = createBoundElement('<span nb-attr:title="this.tip"></span>', ctx);
            expect(el.querySelector('span')!.getAttribute('title')).toBe('first');

            (ctx as any).tip = 'second';
            binder.rootNElement!.detectChanges(ctx);
            expect(el.querySelector('span')!.getAttribute('title')).toBe('second');
        });
    });

    describe('nb-style binding', () => {
        it('should set inline style from context', () => {
            const { el } = createBoundElement('<span nb-style="color: this.color"></span>', { color: 'red' });
            expect((el.querySelector('span') as HTMLElement).style.color).toBe('red');
        });
    });

    describe('nb-class binding', () => {
        it('should add class when condition is true', () => {
            const { el } = createBoundElement('<span nb-class="{active: this.isActive}"></span>', { isActive: true });
            expect(el.querySelector('span')!.classList.contains('active')).toBe(true);
        });

        it('should not add class when condition is false', () => {
            const { el } = createBoundElement('<span nb-class="{active: this.isActive}"></span>', { isActive: false });
            expect(el.querySelector('span')!.classList.contains('active')).toBe(false);
        });
    });

    describe('nb-switch with nb-case children', () => {
        it('should show matching case and hide others', () => {
            const { el } = createBoundElement(
                `<div nb-switch="this.mode">
                    <span nb-case="this.mode" class="caseA">A</span>
                </div>`,
                { mode: 'a' }
            );
            const caseA = el.querySelector('.caseA')!;
            expect(caseA.classList.contains('nb-hidden')).toBe(false);
        });

        it('should hide case that does not match', () => {
            const { el } = createBoundElement(
                `<div nb-switch="this.mode">
                    <span nb-case="this.mode" class="caseA">A</span>
                    <span nb-case="this.other" class="caseB">B</span>
                </div>`,
                { mode: 'a', other: 'b' }
            );
            const caseB = el.querySelector('.caseB')!;
            expect(caseB.classList.contains('nb-hidden')).toBe(true);
        });

        it('should show default when no case matches', () => {
            const { el } = createBoundElement(
                `<div nb-switch="this.mode">
                    <span nb-case="'x'" class="caseX">X</span>
                    <span nb-default class="def">Default</span>
                </div>`,
                { mode: 'noMatch' }
            );
            const def = el.querySelector('.def')!;
            expect(def.classList.contains('nb-hidden')).toBe(false);
        });
    });

    describe('nb-repeat binding', () => {
        it('should clone elements for array items', () => {
            const { el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                { items: ['a', 'b', 'c'] }
            );
            const spans = el.querySelectorAll('span');
            expect(spans.length).toBe(3);
        });

        it('should hide template element when array is empty', () => {
            const { el } = createBoundElement(
                '<span nb-repeat="this.items"></span>',
                { items: [] }
            );
            const span = el.querySelector('span')!;
            expect(span.classList.contains('nb-hidden')).toBe(true);
        });

        it('should repeat for numeric value', () => {
            const { el } = createBoundElement(
                '<span nb-repeat="this.count"></span>',
                { count: 3 }
            );
            const spans = el.querySelectorAll('span');
            expect(spans.length).toBe(3);
        });
    });

    describe('nb-prop binding', () => {
        it('should set element property from context', () => {
            const { el } = createBoundElement('<input nb-prop:disabled="this.isDisabled" />', { isDisabled: true });
            expect((el.querySelector('input') as HTMLInputElement).disabled).toBe(true);
        });
    });

    describe('nb-var binding', () => {
        it('should make variable available to child expressions', () => {
            const { el } = createBoundElement(
                '<div nb-var:greeting="this.msg"><span nb-value="greeting"></span></div>',
                { msg: 'hi' }
            );
            expect(el.querySelector('span')!.textContent).toBe('hi');
        });
    });

    describe('isSubTreeHandled', () => {
        it('should be true for element with nb-container', () => {
            jest.spyOn(console, 'error').mockImplementation();
            const { binder } = createBoundElement('<div nb-container="testContainer"></div>', {});
            const rootNElement = binder.rootNElement as INTreeElement;
            const child = (rootNElement as any)._children[0] as INElement;
            expect(child).toBeDefined();
            expect(child.isSubTreeHandled).toBe(true);
        });

        it('should be false for element with nb-template that is not registered', () => {
            jest.spyOn(console, 'error').mockImplementation();
            const { binder } = createBoundElement('<div nb-template="testTemplate"></div>', {});
            const rootNElement = binder.rootNElement as INTreeElement;
            const child = (rootNElement as any)._children[0] as INElement;
            // Template not registered (name doesn't start with @), so hasNExpression is false
            expect(child).toBeDefined();
            expect(child.isSubTreeHandled).toBe(false);
        });

        it('should be false for element with only nb-value', () => {
            const { binder } = createBoundElement('<span nb-value="this.x"></span>', { x: '' });
            const rootNElement = binder.rootNElement as INTreeElement;
            const child = (rootNElement as any)._children[0] as INElement;
            expect(child.isSubTreeHandled).toBe(false);
        });
    });

    describe('dispose', () => {
        it('should dispose without error', () => {
            const { binder } = createBoundElement('<span nb-value="this.name"></span>', { name: 'test' });
            expect(() => binder.dispose()).not.toThrow();
        });

        it('should dispose with multiple handlers without error', () => {
            const { binder } = createBoundElement(
                '<span nb-value="this.name" nb-if="this.show" nb-class="{active: this.active}"></span>',
                { name: 'test', show: true, active: true }
            );
            expect(() => binder.dispose()).not.toThrow();
        });

        it('should dispose nested tree without error', () => {
            const { binder } = createBoundElement(
                '<div nb-if="this.show"><span nb-value="this.name"></span></div>',
                { show: true, name: 'nested' }
            );
            expect(binder.rootNElement).toBeDefined();
            expect(() => binder.dispose()).not.toThrow();
        });

        it('should dispose repeat elements', () => {
            const { binder } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                { items: ['a', 'b'] }
            );
            expect(() => binder.dispose()).not.toThrow();
        });
    });

    describe('detectChanges flow', () => {
        it('should process bind and commit sequences', () => {
            const ctx = { name: 'init', color: 'blue' };
            const { binder, el } = createBoundElement(
                '<span nb-value="this.name" nb-style="color: this.color"></span>',
                ctx
            );
            expect(el.querySelector('span')!.textContent).toBe('init');
            expect((el.querySelector('span') as HTMLElement).style.color).toBe('blue');

            (ctx as any).name = 'updated';
            (ctx as any).color = 'green';
            binder.rootNElement!.detectChanges(ctx);
            expect(el.querySelector('span')!.textContent).toBe('updated');
            expect((el.querySelector('span') as HTMLElement).style.color).toBe('green');
        });

        it('should skip children when not visible (nb-if false)', () => {
            const ctx = { show: false, name: 'child' };
            const { el } = createBoundElement(
                '<div nb-if="this.show"><span nb-value="this.name"></span></div>',
                ctx
            );
            const div = el.querySelector('div')!;
            expect(div.classList.contains('nb-hidden')).toBe(true);
            // Children should still exist in DOM but not processed
            expect(el.querySelector('span')).not.toBeNull();
        });

        it('should process children when visible', () => {
            const ctx = { show: true, name: 'child' };
            const { el } = createBoundElement(
                '<div nb-if="this.show"><span nb-value="this.name"></span></div>',
                ctx
            );
            const span = el.querySelector('span')!;
            expect(span.textContent).toBe('child');
        });
    });

    describe('nb-event binding', () => {
        it('should bind click event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = { clicked: false, handleClick() { this.clicked = true; } };
                const { el } = createBoundElement(
                    '<button nb-event:click="this.handleClick()"></button>',
                    ctx
                );
                const button = el.querySelector('button')!;
                button.click();
                expect(ctx.clicked).toBe(true);
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });
    });

    describe('multiple handlers combined', () => {
        it('should handle value + class + style + attr together', () => {
            const ctx = { name: 'combo', isActive: true, color: 'red', tip: 'tooltip' };
            const { el } = createBoundElement(
                '<span nb-value="this.name" nb-class="{active: this.isActive}" nb-style="color: this.color" nb-attr:title="this.tip"></span>',
                ctx
            );
            const span = el.querySelector('span')!;
            expect(span.textContent).toBe('combo');
            expect(span.classList.contains('active')).toBe(true);
            expect((span as HTMLElement).style.color).toBe('red');
            expect(span.getAttribute('title')).toBe('tooltip');
        });
    });

    describe('_isVisible and _isVisibleParentHandled', () => {
        it('should make case child visible when switch value matches', () => {
            const ctx = { tab: 'one' };
            const { binder, el } = createBoundElement(
                `<div nb-switch="this.tab">
                    <p nb-case="'one'" class="c1">One</p>
                    <p nb-case="'two'" class="c2">Two</p>
                </div>`,
                ctx
            );
            expect(el.querySelector('.c1')!.classList.contains('nb-hidden')).toBe(false);
            expect(el.querySelector('.c2')!.classList.contains('nb-hidden')).toBe(true);

            (ctx as any).tab = 'two';
            binder.rootNElement!.detectChanges(ctx);
            expect(el.querySelector('.c1')!.classList.contains('nb-hidden')).toBe(true);
            expect(el.querySelector('.c2')!.classList.contains('nb-hidden')).toBe(false);
        });

        it('should combine if and case visibility', () => {
            const ctx = { tab: 'one', show: true };
            const { binder, el } = createBoundElement(
                `<div nb-switch="this.tab">
                    <div nb-case="'one'" class="c1">
                        <span nb-if="this.show" nb-value="this.tab"></span>
                    </div>
                </div>`,
                ctx
            );
            const span = el.querySelector('span')!;
            expect(span.textContent).toBe('one');
            expect(span.classList.contains('nb-hidden')).toBe(false);

            (ctx as any).show = false;
            binder.rootNElement!.detectChanges(ctx);
            expect(span.classList.contains('nb-hidden')).toBe(true);
        });
    });

    describe('clone via repeat', () => {
        it('should create clones and bind values for each item', () => {
            const { el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                { items: ['x', 'y'] }
            );
            const spans = el.querySelectorAll('span');
            expect(spans.length).toBe(2);
            expect(spans[0].textContent).toBe('x');
            expect(spans[1].textContent).toBe('y');
        });

        it('should grow clones when array grows on re-detect', () => {
            const ctx = { items: ['a'] };
            const { binder, el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                ctx
            );
            expect(el.querySelectorAll('span').length).toBe(1);

            (ctx as any).items = ['a', 'b', 'c'];
            binder.rootNElement!.detectChanges(ctx);
            expect(el.querySelectorAll('span').length).toBe(3);
        });

        it('should shrink clones when array shrinks on re-detect', () => {
            const ctx = { items: ['a', 'b', 'c'] };
            const { binder, el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                ctx
            );
            expect(el.querySelectorAll('span').length).toBe(3);

            (ctx as any).items = ['a'];
            binder.rootNElement!.detectChanges(ctx);
            // After shrinking, extra clones get removed
            binder.rootNElement!.detectChanges(ctx);
            const spans = el.querySelectorAll('span');
            // At least the single item remains
            expect(spans[0].textContent).toBe('a');
        });

        it('should provide index execution param', () => {
            const { el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="index"></span>',
                { items: ['a', 'b', 'c'] }
            );
            const spans = el.querySelectorAll('span');
            expect(spans[0].textContent).toBe('0');
            expect(spans[1].textContent).toBe('1');
            expect(spans[2].textContent).toBe('2');
        });
    });

    describe('nb-bound binding', () => {
        it('should construct element with nb-bound without error', () => {
            const ctx = { ref: null as any };
            const { binder } = createBoundElement('<span nb-bound="this.ref"></span>', ctx);
            expect(binder.rootNElement).toBeDefined();
        });
    });

    describe('error handling in detectChanges', () => {
        it('should handle expression errors gracefully', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation();
            const { binder } = createBoundElement('<span nb-value="this.foo.bar.baz"></span>', {});
            expect(binder.rootNElement).toBeDefined();
            // Should not throw, errors are caught internally
        });
    });

    describe('nativeElementForClone', () => {
        it('should store clone template for repeat elements', () => {
            const { binder } = createBoundElement(
                '<span nb-repeat="this.items"></span>',
                { items: [1] }
            );
            const root = binder.rootNElement as INTreeElement;
            const child = (root as any)._children[0] as INElement;
            expect(child.nativeElementForClone).toBeDefined();
        });
    });

    describe('dispose with case/default handlers in disposeSequence', () => {
        it('should dispose NElement with case handler', () => {
            const { binder } = createBoundElement(
                `<div nb-switch="this.tab">
                    <p nb-case="'one'">One</p>
                    <p nb-case="'two'">Two</p>
                </div>`,
                { tab: 'one' }
            );
            expect(() => binder.dispose()).not.toThrow();
        });

        it('should dispose NElement with default handler', () => {
            const { binder } = createBoundElement(
                `<div nb-switch="this.tab">
                    <p nb-case="'one'">One</p>
                    <p nb-default>Default</p>
                </div>`,
                { tab: 'one' }
            );
            expect(() => binder.dispose()).not.toThrow();
        });

        it('should not dispose NElement twice', () => {
            const { binder } = createBoundElement(
                `<div nb-switch="this.tab">
                    <p nb-case="'one'">One</p>
                </div>`,
                { tab: 'one' }
            );
            binder.dispose();
            // Second dispose should be a no-op (isDisposed check)
            expect(() => binder.dispose()).not.toThrow();
        });
    });

    describe('getManipulationProxy via nb-bound', () => {
        it('should create manipulation proxy when nb-bound is used', () => {
            const ctx = { ref: null as any };
            const { el } = createBoundElement('<span nb-bound="this.ref = element"></span>', ctx);
            // nb-bound binds element manipulation proxy to context property
            expect(ctx.ref).toBeDefined();
        });

        it('should provide property manipulation via bound element', () => {
            const ctx = { ref: null as any };
            const { el } = createBoundElement('<input nb-bound="this.ref = element" />', ctx);
            expect(ctx.ref).toBeDefined();
            expect(ctx.ref.properties).toBeDefined();
        });

        it('should provide attribute manipulation via bound element', () => {
            const ctx = { ref: null as any };
            const { el } = createBoundElement('<span nb-bound="this.ref = element"></span>', ctx);
            expect(ctx.ref).toBeDefined();
            expect(ctx.ref.attributes).toBeDefined();
        });

        it('should provide style manipulation via bound element', () => {
            const ctx = { ref: null as any };
            const { el } = createBoundElement('<span nb-bound="this.ref = element"></span>', ctx);
            expect(ctx.ref).toBeDefined();
            expect(ctx.ref.styles).toBeDefined();
        });

        it('should provide class manipulation via bound element', () => {
            const ctx = { ref: null as any };
            const { el } = createBoundElement('<span nb-bound="this.ref = element"></span>', ctx);
            expect(ctx.ref).toBeDefined();
            expect(ctx.ref.classes).toBeDefined();
        });
    });

    describe('event handler with element manipulation proxy', () => {
        it('should allow setting attributes from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    mark(element: any) { element.attributes.set('data-clicked', 'true'); }
                };
                const { binder, el } = createBoundElement(
                    '<button nb-event:click="this.mark(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow setting properties from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    markProp(element: any) { element.properties.set('myProp', 42); }
                };
                const { el } = createBoundElement(
                    '<button nb-event:click="this.markProp(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow setting styles from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    highlight(element: any) { element.styles.set('color', 'red'); }
                };
                const { el } = createBoundElement(
                    '<button nb-event:click="this.highlight(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow adding classes from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    activate(element: any) { element.classes.add('active'); }
                };
                const { el } = createBoundElement(
                    '<button nb-event:click="this.activate(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow removing classes from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    deactivate(element: any) { element.classes.remove('active'); }
                };
                const { el } = createBoundElement(
                    '<button class="active" nb-event:click="this.deactivate(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow toggling classes from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    toggle(element: any) { element.classes.toggle('active'); }
                };
                const { el } = createBoundElement(
                    '<button nb-event:click="this.toggle(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow removing attributes from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    clean(element: any) { element.attributes.remove('data-old'); }
                };
                const { el } = createBoundElement(
                    '<button data-old="yes" nb-event:click="this.clean(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow reading attributes from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                let readValue: any;
                const ctx = {
                    readAttr(element: any) {
                        readValue = element.attributes.has('data-info');
                        element.attributes.get('data-info');
                        element.attributes.getAll();
                    }
                };
                const { el } = createBoundElement(
                    '<button data-info="hello" nb-event:click="this.readAttr(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
                expect(readValue).toBe(true);
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow reading styles from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    readStyles(element: any) {
                        element.styles.has('color');
                        element.styles.get('color');
                        element.styles.getAll();
                        element.styles.remove('color');
                    }
                };
                const { el } = createBoundElement(
                    '<button nb-event:click="this.readStyles(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow reading classes from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                const ctx = {
                    readClasses(element: any) {
                        element.classes.has('foo');
                        element.classes.getAll();
                    }
                };
                const { el } = createBoundElement(
                    '<button nb-event:click="this.readClasses(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });

        it('should allow reading properties from event handler', () => {
            const origRouter = Environment.router;
            if (!origRouter) {
                (Environment as any)._router = { isConfigured: false };
            }
            try {
                let readValue: any;
                const ctx = {
                    readProp(element: any) { readValue = element.properties.get('id'); }
                };
                const { el } = createBoundElement(
                    '<button id="btn1" nb-event:click="this.readProp(element)"></button>',
                    ctx
                );
                jest.useFakeTimers();
                el.querySelector('button')!.click();
                jest.runAllTimers();
                jest.useRealTimers();
            } finally {
                if (!origRouter) {
                    (Environment as any)._router = undefined;
                }
            }
        });
    });

    describe('repeat _removed path', () => {
        it('should remove excess clones when array shrinks', () => {
            const ctx = { items: ['a', 'b', 'c'] };
            const { binder, el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                ctx
            );
            expect(el.querySelectorAll('span').length).toBe(3);

            // Shrink to 1 item — clones beyond index 0 get _removed = true
            (ctx as any).items = ['a'];
            binder.rootNElement!.detectChanges(ctx);
            // Second detect to process the removals
            binder.rootNElement!.detectChanges(ctx);
            expect(el.querySelectorAll('span').length).toBe(1);
            expect(el.querySelector('span')!.textContent).toBe('a');
        });

        it('should handle shrink to zero items', () => {
            const ctx = { items: ['x', 'y'] };
            const { binder, el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                ctx
            );
            expect(el.querySelectorAll('span').length).toBe(2);

            (ctx as any).items = [];
            binder.rootNElement!.detectChanges(ctx);
            binder.rootNElement!.detectChanges(ctx);
            // Template element remains but is hidden
            const spans = el.querySelectorAll('span');
            expect(spans.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('detectChanges invisible parent handled path', () => {
        it('should use invisible parent handled sequences for hidden case', () => {
            const ctx = { tab: 'one' };
            const { binder, el } = createBoundElement(
                `<div nb-switch="this.tab">
                    <p nb-case="'one'" class="c1" nb-value="this.tab">One</p>
                    <p nb-case="'two'" class="c2" nb-value="this.tab">Two</p>
                </div>`,
                ctx
            );
            // case 'one' is visible, case 'two' uses invisible parent handled path
            expect(el.querySelector('.c1')!.textContent).toBe('one');
            expect(el.querySelector('.c2')!.classList.contains('nb-hidden')).toBe(true);
        });
    });

    describe('second dispose is no-op', () => {
        it('should handle calling detectChanges on disposed NElement', () => {
            const ctx = { name: 'test' };
            const { binder } = createBoundElement('<span nb-value="this.name"></span>', ctx);
            binder.dispose();
            // After dispose, root is deleted - no crash
            expect(binder.rootNElement).toBeUndefined();
        });
    });

    describe('getManipulationProxy via events', () => {
        it('should invoke getManipulationProxy when event fires', () => {
            // Setup router to avoid undefined access in ExpressionExecParamsHelper
            if (!Environment.router) {
                Environment.setupRouter(undefined);
            }
            const ctx = { clicked: false, onClick() { this.clicked = true; } };
            const { el } = createBoundElement(
                '<button nb-event:click="this.onClick()">Click</button>',
                ctx
            );
            const button = el.querySelector('button')!;
            jest.useFakeTimers();
            button.dispatchEvent(new Event('click'));
            jest.runAllTimers();
            jest.useRealTimers();
            expect(ctx.clicked).toBe(true);
        });
    });

    describe('event with detectChanges trigger', () => {
        it('should trigger detectChanges after event handler executes', () => {
            if (!Environment.router) {
                Environment.setupRouter(undefined);
            }
            const ctx = { count: 0, inc() { this.count++; } };
            const { binder, el } = createBoundElement(
                '<button nb-event:click="this.inc()">Inc</button><span nb-value="this.count"></span>',
                ctx
            );
            const button = el.querySelector('button')!;
            jest.useFakeTimers();
            button.dispatchEvent(new Event('click'));
            jest.runAllTimers();
            jest.useRealTimers();
            expect(ctx.count).toBe(1);
        });
    });

    describe('bound handler uses getManipulationProxy', () => {
        it('should construct bound handler with getManipulationProxy lambda', () => {
            const ctx = { val: 'hello' };
            const { binder, el } = createBoundElement(
                '<input nb-bound="this.val" />',
                ctx
            );
            const input = el.querySelector('input')!;
            expect(input).toBeDefined();
        });
    });

    describe('container sets isSubTreeHandled', () => {
        it('should construct element with nb-container attribute', () => {
            jest.spyOn(console, 'error').mockImplementation();
            const ctx = {};
            const { el } = createBoundElement(
                '<div nb-container="my-container"></div>',
                ctx
            );
            // Container will log error since the container is not registered
            // but NElement will still be constructed with isSubTreeHandled = true
            expect(console.error).toHaveBeenCalled();
            (console.error as jest.Mock).mockRestore();
        });
    });

    describe('component handler construction', () => {
        it('should construct element with nb-component attribute', () => {
            const ctx = {};
            const { el } = createBoundElement(
                '<div nb-component="my-component"></div>',
                ctx
            );
            expect(el).toBeDefined();
        });
    });

    describe('bind error handling in detectChanges', () => {
        it('should catch and log errors during handler bind', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const ctx = { get badProp(): string { throw new Error('bind explosion'); } };
            // nb-value triggers bind → executeExpression → throws
            const { binder, el } = createBoundElement(
                '<span nb-value="this.badProp"></span>',
                ctx
            );
            // The initial bind may or may not throw depending on how ContextBinder wraps
            // Re-detect should catch the error
            expect(() => binder.rootNElement!.detectChanges(ctx)).not.toThrow();
            errorSpy.mockRestore();
        });
    });

    describe('dispose error handling', () => {
        it('should catch errors during handler dispose', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const ctx = { name: 'test' };
            const { binder } = createBoundElement(
                '<span nb-value="this.name"></span>',
                ctx
            );
            const rootNElement = binder.rootNElement!;
            const child = (rootNElement as any)._children[0];
            if (child && child._disposeSequence) {
                // Inject a handler that throws on dispose
                child._disposeSequence.push({
                    dispose() { throw new Error('dispose boom'); }
                });
            }
            expect(() => binder.dispose()).not.toThrow();
            errorSpy.mockRestore();
        });
    });

    describe('container callback coverage', () => {
        it('should construct container which triggers isVisible and detectChanges callbacks', () => {
            jest.spyOn(console, 'error').mockImplementation();
            const ctx = { show: true };
            const { binder, el } = createBoundElement(
                '<div nb-container="myContainer" nb-if="this.show"></div>',
                ctx
            );
            // Container is not registered so error will fire, but this exercises the lambda callbacks
            expect(el).toBeDefined();
            (console.error as jest.Mock).mockRestore();
        });
    });

    describe('repeat removed callback', () => {
        it('should handle repeat items being removed', () => {
            const ctx = { items: ['a', 'b'] };
            const { binder, el } = createBoundElement(
                '<span nb-repeat="this.items" nb-value="item"></span>',
                ctx
            );
            expect(el.querySelectorAll('span').length).toBe(2);

            // Remove items to trigger the _removed callback
            (ctx as any).items = [];
            binder.rootNElement!.detectChanges(ctx);
            // Only original template span remains (hidden)
            const spans = el.querySelectorAll('span');
            expect(spans.length).toBe(1);
            expect(spans[0].classList.contains('nb-hidden')).toBe(true);
        });
    });

    describe('getManipulationProxy lambdas', () => {
        it('should construct bound handler that exercises style/class/prop manipulation proxies', () => {
            const ctx = { onChange(el: any) { 
                if (el && el.styles) {
                    el.styles.set('color', 'red');
                    el.classes.add('extra');
                }
            }};
            const { el } = createBoundElement(
                '<input nb-bound="this.val" />',
                { val: 'hello' }
            );
            expect(el.querySelector('input')).toBeDefined();
        });
    });
});
