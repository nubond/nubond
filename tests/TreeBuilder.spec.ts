import { TreeBuilder } from '../src/TreeBuilder';
import { ContextBinder } from '../src/ContextBinder';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('TreeBuilder', () => {
    function createContextBinder(): ContextBinder {
        return new ContextBinder(
            undefined,
            false,
            () => 'nb-hidden',
            undefined,
            () => false,
            () => undefined,
            () => undefined
        );
    }

    describe('constructTree', () => {
        it('should construct tree for element without bindings', () => {
            const el = document.createElement('div');
            el.innerHTML = '<p>text</p><span>more text</span>';
            const binder = createContextBinder();
            
            const tree = TreeBuilder.constructTree(binder, el, false);
            expect(tree).toBeDefined();
            expect(tree.nativeElement).toBe(el);
        });

        it('should construct tree for element with nb bindings', () => {
            const el = document.createElement('div');
            el.innerHTML = '<p nb-value="ctx.name"></p>';
            const binder = createContextBinder();

            const tree = TreeBuilder.constructTree(binder, el, false);
            expect(tree).toBeDefined();
        });

        it('should construct tree for root element that is bindable', () => {
            const el = document.createElement('div');
            el.setAttribute('nb-value', 'ctx.title');
            const binder = createContextBinder();

            const tree = TreeBuilder.constructTree(binder, el, true);
            expect(tree).toBeDefined();
        });

        it('should handle nested elements', () => {
            const el = document.createElement('div');
            el.innerHTML = `
                <div nb-value="ctx.a">
                    <span nb-value="ctx.b"></span>
                </div>
            `;
            const binder = createContextBinder();

            const tree = TreeBuilder.constructTree(binder, el, false);
            expect(tree).toBeDefined();
        });

        it('should handle empty element', () => {
            const el = document.createElement('div');
            const binder = createContextBinder();

            const tree = TreeBuilder.constructTree(binder, el, false);
            expect(tree).toBeDefined();
        });

        it('should construct tree for ShadowRoot with bindNativeElement=true', () => {
            const host = document.createElement('div');
            const shadow = host.attachShadow({ mode: 'open' });
            shadow.innerHTML = '<p>shadow content</p>';
            const binder = createContextBinder();

            const tree = TreeBuilder.constructTree(binder, shadow, true);
            expect(tree).toBeDefined();
            // When bindable + ShadowRoot, uses host element
            expect(tree.nativeElement).toBe(host);
        });

        it('should construct tree for ShadowRoot with bindNativeElement=false', () => {
            const host = document.createElement('div');
            const shadow = host.attachShadow({ mode: 'open' });
            shadow.innerHTML = '<span>shadow text</span>';
            const binder = createContextBinder();

            const tree = TreeBuilder.constructTree(binder, shadow, false);
            expect(tree).toBeDefined();
            // When not bindable + ShadowRoot, uses NTreeElement with host
            expect(tree.nativeElement).toBe(host);
        });
    });

    describe('#10: cloneTree honors isSubTreeHandled', () => {
        // A repeat element that also owns its subtree (nb-value / nb-html / nb-container /
        // nb-component / nb-template) must not have children tree-built — the normal path guards
        // with `!isSubTreeHandled`, and clones have to behave identically. Otherwise the original
        // (index 0) skips its children while every clone binds them, and those child NElements
        // keep binding forever even though nb-value has already removed them from the DOM.
        function bindRepeat(html: string, context: any) {
            const el = document.createElement('div');
            el.innerHTML = html;
            const binder = createContextBinder();
            binder.bind(el, context, false, false);
            const grandChildrenCounts = ((binder.rootNElement as any)._children as Array<any>)
                                            .map(child => child._children.length);
            return { binder, el, grandChildrenCounts };
        }

        it('should not tree-build clone children when the repeat element also has nb-value', () => {
            const context: any = { items: ['a', 'b', 'c'], hits: 0, hit() { this.hits++; return ''; } };

            const { binder, grandChildrenCounts } = bindRepeat(
                `<div nb-repeat="this.items" nb-value="item"><span nb-exec="this.hit()"></span></div>`,
                context
            );

            // original and both clones agree — none of them binds the child
            expect(grandChildrenCounts).toEqual([0, 0, 0]);
            expect(context.hits).toBe(0);

            // and the zombie children do not resurface on later cycles
            binder.rootNElement!.detectChanges(context);
            expect(context.hits).toBe(0);
        });

        it('should not tree-build clone children when the repeat element also has nb-html', () => {
            const context: any = { items: ['a', 'b'], hits: 0, hit() { this.hits++; return ''; } };

            const { grandChildrenCounts } = bindRepeat(
                `<div nb-repeat="this.items" nb-html="'<i>x</i>'"><span nb-exec="this.hit()"></span></div>`,
                context
            );

            expect(grandChildrenCounts).toEqual([0, 0]);
            expect(context.hits).toBe(0);
        });

        it('should still tree-build clone children for a plain repeat', () => {
            // Control: the guard must key on isSubTreeHandled, not on being a clone.
            const context: any = { items: ['a', 'b', 'c'], hits: 0, hit() { this.hits++; return ''; } };

            const { grandChildrenCounts } = bindRepeat(
                `<div nb-repeat="this.items"><span nb-exec="this.hit()"></span></div>`,
                context
            );

            expect(grandChildrenCounts).toEqual([1, 1, 1]);
            expect(context.hits).toBe(3);
        });
    });
});
