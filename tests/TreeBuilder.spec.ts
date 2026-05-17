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
});
