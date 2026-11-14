import { Projection } from '../../../src/nElement/handlers/Projection';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { ContextBinder } from '../../../src/ContextBinder';
import { Environment } from '../../../src/Environment';
import { Constants } from '../../../src/Constants';
import { Console } from '../../../src/Console';

// L-29 / L-35: projected content is bound by the context that AUTHORED it (the outer context), not by the
// container / component that receives it. Projected clones carry the system marker nb-encapsulated; the tree
// walk re-parents a marked element to the host NElement in the outer tree (TreeBuilder), and the Projection
// handler ties its lifetime and visibility to the inner element that holds the slot (its "immediate parent").

if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

let uid = 0;
const name = (base: string) => `${base}${++uid}`;

function createBinder(pessimistic = false): ContextBinder {
    return new ContextBinder(null, null, undefined, pessimistic, () => 'nb-hidden', undefined,
                             () => false, () => undefined, () => undefined);
}

function render(html: string, host: any = { outer: 'OUTER' }, pessimistic = false) {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);

    const binder = createBinder(pessimistic);
    binder.bind(root, host, true, false);
    jest.runAllTimers();

    return { root, binder, host };
}

function texts(root: ParentNode, selector: string): Array<string> {
    return Array.from(root.querySelectorAll(selector)).map(el => (el.textContent ?? '').trim());
}

/** children of the first NElement under the binder root, i.e. of the outer host element */
function hostChildren(binder: ContextBinder): number {
    return (binder as any).rootNElement._children[0]._children.length;
}

function lifecycleCounter() {
    const counts = { created: 0, disposed: 0 };
    const ctx = class { constructor() { counts.created++; } onDispose() { counts.disposed++; } };
    return { counts, ctx };
}

describe('Projection handler (unit)', () => {
    function attributesFor(attrs: Record<string, string>): Attributes {
        const el = document.createElement('div');
        for (const [key, value] of Object.entries(attrs)) {
            el.setAttribute(key, value);
        }
        return new Attributes(el, () => false);
    }

    function immediateParent(visible = true, parent: any = null) {
        const callbacks: Array<() => void> = [];
        const unsubscribe = jest.fn();
        return {
            isVisible: visible,
            parent,
            onDispose: jest.fn((cb: () => void) => { callbacks.push(cb); return unsubscribe; }),
            raise: () => callbacks.forEach(cb => cb()),
            unsubscribe
        } as any;
    }

    it('is inactive without an immediate parent (element was not re-parented)', () => {
        const handler = new Projection(undefined, attributesFor({ 'nb-projection': '' }), jest.fn(), jest.fn());

        expect(handler.hasNExpression).toBe(false);
        expect(handler.isVisible).toBe(true);
        expect(() => handler.construct()).not.toThrow();
    });

    it('is inactive without nb-projection', () => {
        const handler = new Projection(immediateParent(), attributesFor({ 'nb-value': 'this.x' }), jest.fn(), jest.fn());

        expect(handler.hasNExpression).toBe(false);
    });

    it.each([[''], ['slot']])('is active for nb-projection="%s" with an immediate parent (default and named slot)', (value) => {
        const handler = new Projection(immediateParent(), attributesFor({ 'nb-projection': value }), jest.fn(), jest.fn());

        expect(handler.hasNExpression).toBe(true);
    });

    it('construct() subscribes to the immediate parent dispose and requests one detection', () => {
        const parent = immediateParent();
        const requestDetect = jest.fn();
        const disposeNElement = jest.fn();
        const handler = new Projection(parent, attributesFor({ 'nb-projection': '' }), requestDetect, disposeNElement);

        handler.construct();

        expect(parent.onDispose).toHaveBeenCalledTimes(1);
        expect(requestDetect).toHaveBeenCalledTimes(1);

        parent.raise();
        expect(disposeNElement).toHaveBeenCalledTimes(1);
    });

    it('dispose() unsubscribes from the immediate parent', () => {
        const parent = immediateParent();
        const handler = new Projection(parent, attributesFor({ 'nb-projection': '' }), jest.fn(), jest.fn());

        handler.construct();
        handler.dispose();
        handler.dispose();

        expect(parent.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('isVisible walks the whole inner parent chain', () => {
        const grandParent = immediateParent(false);
        const parent = immediateParent(true, grandParent);
        const handler = new Projection(parent, attributesFor({ 'nb-projection': '' }), jest.fn(), jest.fn());

        expect(handler.isVisible).toBe(false);

        grandParent.isVisible = true;
        expect(handler.isVisible).toBe(true);

        parent.isVisible = false;
        expect(handler.isVisible).toBe(false);
    });
});

describe('Projection (integration)', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        errorSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    describe.each([
        ['default slot', 'nb-projection', 'nb-project-to=""'],
        ['named slot', 'nb-projection="a"', 'nb-project-to="a"'],
    ])('%s', (_label, P, S) => {
        describe('authoring context (L-35)', () => {
            it('evaluates against the outer context even when the host has a same-named property', () => {
                const host = name('PAuth');
                Environment.addContainer(host, class { outer = 'INNER'; } as any, [], `<article ${S}></article>`, undefined);

                const { root } = render(`<div nb-container="@${host}"><b ${P}><i nb-value="this.outer"></i></b></div>`);

                expect(texts(root, 'article b i')).toEqual(['OUTER']);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('re-renders when the outer context changes', () => {
                const host = name('PChange');
                Environment.addContainer(host, class {} as any, [], `<article ${S}></article>`, undefined);
                const r = render(`<div nb-container="@${host}"><b ${P}><i nb-value="this.outer"></i></b></div>`);

                r.host.outer = 'CHANGED';
                r.binder.detectChanges();
                jest.runAllTimers();

                expect(texts(r.root, 'article b i')).toEqual(['CHANGED']);
            });

            it('an inner detection does not re-evaluate the projection against the inner context', () => {
                const host = name('PInnerDetect');
                Environment.addContainer(host, class { outer = 'INNER'; poke() { this.outer = 'INNER2'; } } as any, [],
                                         `<article ${S}></article><button nb-event:click="this.poke()"></button>`, undefined);
                const { root } = render(`<div nb-container="@${host}"><b ${P}><i nb-value="this.outer"></i></b></div>`);

                (root.querySelector('button') as HTMLElement).click();
                jest.runAllTimers();

                expect(texts(root, 'article b i')).toEqual(['OUTER']);
            });

            it('runs nb-event handlers on the outer context', () => {
                const host = name('PEvent');
                Environment.addContainer(host, class { n = 100; inc() { this.n += 100; } } as any, [], `<article ${S}></article>`, undefined);
                const outer: any = { n: 0, inc() { this.n++; } };
                const { root } = render(`<div nb-container="@${host}"><button ${P} nb-event:click="this.inc()"><i nb-value="this.n"></i></button></div>`, outer);

                (root.querySelector('button') as HTMLElement).click();
                jest.runAllTimers();

                expect(outer.n).toBe(1);
                expect(texts(root, 'button i')).toEqual(['1']);
            });

            it('sees outer nb-repeat item and outer nb-var', () => {
                const host = name('PScope');
                Environment.addContainer(host, class {} as any, [], `<article ${S}></article>`, undefined);

                let r = render(`<div nb-repeat="this.rows"><div nb-container="@${host}"><b ${P}><i nb-value="item"></i></b></div></div>`,
                               { rows: [1, 2, 3] });
                expect(texts(r.root, 'article b i')).toEqual(['1', '2', '3']);

                r = render(`<div nb-var:v="this.outer"><div nb-container="@${host}"><b ${P}><i nb-value="v"></i></b></div></div>`);
                expect(texts(r.root, 'article b i')).toEqual(['OUTER']);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('allows content handlers on the projected root itself (nb-value / nb-html / nb-container / nb-switch)', () => {
                const host = name('PRootHandlers');
                const nested = name('PRootNested');
                Environment.addContainer(host, class { outer = 'INNER'; } as any, [], `<article ${S}></article>`, undefined);
                Environment.addContainer(nested, class {} as any, [], '<s>nested</s>', undefined);
                const outer = { outer: '<em>OUTER</em>', v: 2 };

                expect(render(`<div nb-container="@${host}"><b ${P} nb-value="this.outer">x</b></div>`, outer).root
                    .querySelector('article b')!.textContent).toBe('<em>OUTER</em>');
                expect(render(`<div nb-container="@${host}"><b ${P} nb-html="this.outer">x</b></div>`, outer).root
                    .querySelector('article b')!.innerHTML).toBe('<em>OUTER</em>');
                expect(texts(render(`<div nb-container="@${host}"><b ${P} nb-container="@${nested}">x</b></div>`, outer).root,
                             'article b s')).toEqual(['nested']);

                const sw = render(`<div nb-container="@${host}"><b ${P} nb-switch="this.v"><i nb-case="@1">one</i><i nb-case="@2">two</i></b></div>`, outer).root;
                expect(Array.from(sw.querySelectorAll('article b i')).filter(e => !e.classList.contains('nb-hidden')).map(e => e.textContent))
                    .toEqual(['two']);
                expect(errorSpy).not.toHaveBeenCalled();
            });
        });

        describe('slots', () => {
            it('fills a slot inside the host nb-repeat in every row, each row bound with working handlers (B)', () => {
                const host = name('PRows');
                Environment.addContainer(host, class { rows = [1, 2, 3]; outer = 'INNER'; } as any, [],
                                         `<div nb-repeat="this.rows"><i ${S}></i></div>`, undefined);
                const outer: any = { outer: 'OUTER', n: 0, inc() { this.n++; } };
                const { root } = render(`<div nb-container="@${host}"><b ${P} nb-event:click="this.inc()"><u nb-value="this.outer"></u></b></div>`, outer);

                expect(texts(root, 'i b u')).toEqual(['OUTER', 'OUTER', 'OUTER']);

                (root.querySelectorAll('i b')[2] as HTMLElement).click();
                jest.runAllTimers();
                expect(outer.n).toBe(1);
            });

            it('binds rows the inner repeat adds later without waiting for an outer cycle', () => {
                const host = name('PGrow');
                Environment.addContainer(host, class { rows = [1]; more() { this.rows = [1, 2, 3]; } } as any, [],
                                         `<button nb-event:click="this.more()"></button><div nb-repeat="this.rows"><i ${S}></i></div>`, undefined);
                const { root } = render(`<div nb-container="@${host}"><b ${P}><u nb-value="this.outer"></u></b></div>`);

                (root.querySelector('button') as HTMLElement).click();
                jest.runAllTimers();

                expect(texts(root, 'i b u')).toEqual(['OUTER', 'OUTER', 'OUTER']);
            });

            it('re-projects through a nested container, still bound by the outermost author (C)', () => {
                const inner = name('PReD');
                const host = name('PReC');
                Environment.addContainer(inner, class { outer = 'D'; } as any, [], '<section nb-project-to="x"></section>', undefined);
                Environment.addContainer(host, class { outer = 'C'; } as any, [],
                                         `<div nb-container="@${inner}"><em nb-projection="x" ${S}></em></div>`, undefined);

                const { root } = render(`<div nb-container="@${host}"><b ${P}><i nb-value="this.outer"></i></b></div>`);

                expect(texts(root, 'section em b i')).toEqual(['OUTER']);
            });

            it('fills every slot that shares a name', () => {
                const host = name('PTwice');
                Environment.addContainer(host, class {} as any, [], `<i ${S}></i><u ${S}></u>`, undefined);

                const { root } = render(`<div nb-container="@${host}"><b ${P}><s nb-value="this.outer"></s></b></div>`);

                expect(texts(root, 'i b s')).toEqual(['OUTER']);
                expect(texts(root, 'u b s')).toEqual(['OUTER']);
            });

            it('nb-project-instead replaces the slot element', () => {
                const host = name('PInstead');
                Environment.addContainer(host, class {} as any, [],
                                         `<div ${S.replace('nb-project-to', 'nb-project-instead')}>default</div>`, undefined);

                const { root } = render(`<div nb-container="@${host}"><b ${P}><s nb-value="this.outer"></s></b></div>`);

                expect(root.querySelector(`[nb-project-instead]`)).toBeNull();
                expect(texts(root, 'b s')).toEqual(['OUTER']);
            });

            it('supports nb-if / nb-repeat inside the projected root and nb-repeat on it', () => {
                const host = name('PInside');
                Environment.addContainer(host, class { rows = [9]; } as any, [], `<ul ${S}></ul>`, undefined);

                let r = render(`<div nb-container="@${host}"><li ${P} nb-if="true"><span nb-value="this.outer"></span><i nb-repeat="this.rows" nb-value="item"></i></li></div>`,
                               { outer: 'OUTER', rows: [1, 2, 3] });
                expect(texts(r.root, 'li span')).toEqual(['OUTER']);
                expect(texts(r.root, 'li i')).toEqual(['1', '2', '3']);

                r = render(`<div nb-container="@${host}"><li ${P} nb-repeat="this.rows"><i nb-value="item"></i></li></div>`, { rows: [1, 2, 3] });
                expect(texts(r.root, 'ul li')).toEqual(['1', '2', '3']);

                r.host.rows = [7, 8];
                r.binder.detectChanges();
                jest.runAllTimers();
                expect(texts(r.root, 'ul li')).toEqual(['7', '8']);

                r.host.rows = [1, 2, 3, 4];
                r.binder.detectChanges();
                jest.runAllTimers();
                expect(texts(r.root, 'ul li')).toEqual(['1', '2', '3', '4']);
                expect(errorSpy).not.toHaveBeenCalled();
            });

            it('E/F/G: own slots only, unmatched defaults stay bound, replaced defaults are never created', () => {
                const nestedD = name('PE_D');
                const hostC = name('PE_C');
                Environment.addContainer(nestedD, class {} as any, [], `<section ${S}></section>`, undefined);
                Environment.addContainer(hostC, class {} as any, [],
                                         `<div nb-container="@${nestedD}"><p ${P}>for-D</p></div><article ${S}></article>`, undefined);
                let r = render(`<div nb-container="@${hostC}"><b ${P}><i nb-value="this.outer"></i></b></div>`);
                expect(texts(r.root, 'section p')).toEqual(['for-D']);
                expect(texts(r.root, 'article b i')).toEqual(['OUTER']);

                const hostF = name('PF');
                Environment.addContainer(hostF, class { text = 'DEF'; } as any, [],
                                         '<div nb-project-instead="missing"><span nb-value="this.text"></span></div>', undefined);
                r = render(`<div nb-container="@${hostF}"></div>`);
                expect(texts(r.root, 'span')).toEqual(['DEF']);

                const { counts, ctx } = lifecycleCounter();
                const replaced = name('PG_N');
                const hostG = name('PG');
                Environment.addContainer(replaced, ctx as any, [], '<s>n</s>', undefined);
                Environment.addContainer(hostG, class {} as any, [], `<div ${S}><span nb-container="@${replaced}"></span></div>`, undefined);
                render(`<div nb-container="@${hostG}"><b ${P}></b></div>`);
                expect(counts.created).toBe(0);
            });
        });

        describe('visibility', () => {
            it.each([
                ['the direct parent', '<div nb-if="this.show"><i SLOT></i></div>'],
                ['a grandparent', '<div nb-if="this.show"><p nb-class="@x"><i SLOT></i></p></div>'],
            ])('does not evaluate the projection while %s of the slot is hidden', (_where, template) => {
                const host = name('PHidden');
                Environment.addContainer(host, class { show = false; } as any, [], template.replace('SLOT', S), undefined);
                let reads = 0, execs = 0;
                const outer: any = { get outer() { reads++; return 'O'; }, hit() { execs++; } };
                const r = render(`<div nb-container="@${host}"><b ${P}><u nb-value="this.outer"></u><q nb-exec="this.hit()"></q></b></div>`, outer);

                reads = 0;
                execs = 0;
                r.binder.detectChanges();
                jest.runAllTimers();

                expect(reads).toBe(0);
                expect(execs).toBe(0);
            });
        });

        describe('disposal', () => {
            it('disposes the projection of a removed inner repeat row, and nothing is evaluated for it afterwards', () => {
                const { counts, ctx } = lifecycleCounter();
                const nested = name('PChurnN');
                const host = name('PChurn');
                Environment.addContainer(nested, ctx as any, [], '<s>n</s>', undefined);
                Environment.addContainer(host, class { rows = [1, 2, 3]; toggle() { this.rows = this.rows.length === 3 ? [1] : [1, 2, 3]; } } as any, [],
                                         `<button nb-event:click="this.toggle()"></button><div nb-repeat="this.rows"><i ${S}></i></div>`, undefined);
                let reads = 0, execs = 0;
                const outer: any = { get outer() { reads++; return 'O'; }, hit() { execs++; } };
                const r = render(`<div nb-container="@${host}"><b ${P}><u nb-value="this.outer"></u><q nb-exec="this.hit()"></q><span nb-container="@${nested}"></span></b></div>`, outer);
                const button = r.root.querySelector('button') as HTMLElement;

                const step = () => {
                    button.click();
                    jest.runAllTimers();
                    reads = 0;
                    execs = 0;
                    r.binder.detectChanges();
                    jest.runAllTimers();
                };

                expect(hostChildren(r.binder)).toBe(3);
                expect(counts).toEqual({ created: 3, disposed: 0 });

                step(); // 3 -> 1
                expect(hostChildren(r.binder)).toBe(1);
                expect(counts).toEqual({ created: 3, disposed: 2 });
                expect([reads, execs]).toEqual([1, 1]);

                step(); // 1 -> 3
                expect(hostChildren(r.binder)).toBe(3);
                expect(counts).toEqual({ created: 5, disposed: 2 });
                expect([reads, execs]).toEqual([3, 3]);

                step(); // 3 -> 1
                expect(hostChildren(r.binder)).toBe(1);
                expect(counts).toEqual({ created: 5, disposed: 4 });

                r.binder.dispose();
                expect(counts).toEqual({ created: 5, disposed: 5 });
            });

            it('disposes a re-projection when the inner container swaps the slot away, and re-creates it on swap back', () => {
                const { counts, ctx } = lifecycleCounter();
                const nested = name('PSwN');
                const withSlot = name('PSwD1');
                const withoutSlot = name('PSwD2');
                const host = name('PSwX');
                Environment.addContainer(nested, ctx as any, [], '<s>n</s>', undefined);
                Environment.addContainer(withSlot, class {} as any, [], `<section ${S}></section>`, undefined);
                Environment.addContainer(withoutSlot, class {} as any, [], '<p>no slot</p>', undefined);
                Environment.addContainer(host, class { inner = withSlot; sw() { this.inner = this.inner === withSlot ? withoutSlot : withSlot; } } as any, [],
                                         `<button nb-event:click="this.sw()"></button><div nb-container="this.inner"><em ${P} ${S}></em></div>`, undefined);
                let reads = 0;
                const outer: any = { get outer() { reads++; return 'OUTER'; } };
                const r = render(`<div nb-container="@${host}"><b ${P}><i nb-value="this.outer"></i><span nb-container="@${nested}"></span></b></div>`, outer);
                const swap = () => {
                    (r.root.querySelector('button') as HTMLElement).click();
                    jest.runAllTimers();
                    reads = 0;
                    r.binder.detectChanges();
                    jest.runAllTimers();
                };

                expect(texts(r.root, 'section b i')).toEqual(['OUTER']);

                swap();
                expect(r.root.querySelector('section')).toBeNull();
                expect(counts).toEqual({ created: 1, disposed: 1 });
                expect(reads).toBe(0);
                expect(hostChildren(r.binder)).toBe(0);

                swap();
                expect(texts(r.root, 'section b i')).toEqual(['OUTER']);
                expect(counts).toEqual({ created: 2, disposed: 1 });

                r.binder.dispose();
                expect(counts).toEqual({ created: 2, disposed: 2 });
            });

            it('disposes every projected row when the outer container swaps, and re-creates them on swap back', () => {
                const { counts, ctx } = lifecycleCounter();
                const nested = name('POsN');
                const a = name('POsA');
                const b = name('POsB');
                Environment.addContainer(nested, ctx as any, [], '<s>n</s>', undefined);
                Environment.addContainer(a, class { rows = [1, 2, 3]; } as any, [], `<div nb-repeat="this.rows"><i ${S}></i></div>`, undefined);
                Environment.addContainer(b, class {} as any, [], '<p>b</p>', undefined);
                const r = render(`<div nb-container="this.name"><b ${P}><span nb-container="@${nested}"></span></b></div>`, { name: a });

                expect(counts).toEqual({ created: 3, disposed: 0 });

                r.host.name = b;
                r.binder.detectChanges();
                jest.runAllTimers();
                expect(counts).toEqual({ created: 3, disposed: 3 });
                expect(hostChildren(r.binder)).toBe(0);

                r.host.name = a;
                r.binder.detectChanges();
                jest.runAllTimers();
                expect(counts).toEqual({ created: 6, disposed: 3 });

                r.binder.dispose();
                expect(counts).toEqual({ created: 6, disposed: 6 });
            });

            it('disposes nested projections two levels deep', () => {
                const { counts, ctx } = lifecycleCounter();
                const nested = name('PTlN');
                const y = name('PTlY');
                const x = name('PTlX');
                const z = name('PTlZ');
                Environment.addContainer(nested, ctx as any, [], '<s>n</s>', undefined);
                Environment.addContainer(y, class { rows = [1, 2]; } as any, [], `<div nb-repeat="this.rows"><i ${S}></i></div>`, undefined);
                Environment.addContainer(x, class { rows = [1, 2]; } as any, [], `<div nb-repeat="this.rows"><i ${S}></i></div>`, undefined);
                Environment.addContainer(z, class {} as any, [], '<p>z</p>', undefined);
                const r = render(`<div nb-container="this.name"><b ${P}><div nb-container="@${y}"><u ${P}><span nb-container="@${nested}"></span></u></div></b></div>`,
                                 { name: x });

                expect(counts).toEqual({ created: 4, disposed: 0 });

                r.host.name = z;
                r.binder.detectChanges();
                jest.runAllTimers();

                expect(counts).toEqual({ created: 4, disposed: 4 });
            });
        });

        describe('nb-projection that is not projected by a host', () => {
            it('a stray nb-projection under the root binder is bound in place and does not throw', () => {
                const { root } = render(`<div><b ${P}><u nb-value="this.outer"></u></b><ul><li ${P} nb-repeat="this.rows" nb-value="item"></li></ul><p ${P} nb-value="this.outer"></p></div>`,
                                        { outer: 'OUTER', rows: [1, 2, 3] });

                expect(texts(root, 'b u')).toEqual(['OUTER']);
                expect(texts(root, 'li')).toEqual(['1', '2', '3']);
                expect(texts(root, 'p')).toEqual(['OUTER']);
            });

            it('nb-template projection is bound by the context that uses the template (top level, container, component)', () => {
                const tpl = name('PTpl');
                Environment.addTemplate(tpl, `<p ${S}></p><span nb-value="this.outer"></span>`, undefined);

                let r = render(`<div nb-template="@${tpl}"><b ${P}><u nb-value="this.outer"></u></b></div>`);
                expect(texts(r.root, 'p b u')).toEqual(['OUTER']);
                expect(r.root.querySelector('[nb-encapsulated]')).toBeNull();

                const inContainer = name('PTplC');
                Environment.addContainer(inContainer, class { outer = 'INNER'; } as any, [],
                                         `<div nb-template="@${tpl}"><b ${P}><u nb-value="this.outer"></u></b></div>`, undefined);
                r = render(`<div nb-container="@${inContainer}"></div>`);
                expect(texts(r.root, 'p b u')).toEqual(['INNER']);
                expect(texts(r.root, 'span')).toEqual(['INNER']);

                const tag = `p-tpl-${++uid}`;
                Environment.addComponent(tag, class { outer = 'INNER'; } as any, [], undefined,
                                         `<div nb-template="@${tpl}"><b ${P}><u nb-value="this.outer"></u></b></div>`,
                                         undefined, undefined, { shadowRootConfig: { mode: 'open' } } as any);
                r = render(`<${tag}></${tag}>`);
                const shadow = (r.root.querySelector(tag) as any).shadowRoot as ShadowRoot;
                expect(texts(shadow, 'p b u')).toEqual(['INNER']);
            });

            it('nb-projection written by the inner template itself stays in the inner context', () => {
                const stray = name('PStray');
                Environment.addContainer(stray, class { x = 'INNER'; } as any, [], `<p><b ${P} nb-if="true"><i nb-value="this.x"></i></b></p>`, undefined);
                expect(texts(render(`<div nb-container="@${stray}"></div>`, { x: 'OUTER' }).root, 'b i')).toEqual(['INNER']);

                const deep = name('PDeep');
                Environment.addContainer(deep, class { x = 'MID'; } as any, [],
                                         `<div nb-container="this.nope"><section><b ${P}><i nb-value="this.x"></i></b></section></div>`, undefined);
                expect(texts(render(`<div nb-container="@${deep}"></div>`, { x: 'ROOT' }).root, 'b i')).toEqual(['MID']);
            });
        });

        describe('components', () => {
            it('projects into a component shadow root, including a slot inside its own nb-repeat', () => {
                const tag = `p-comp-${++uid}`;
                Environment.addComponent(tag, class { outer = 'INNER'; text = 'IN'; rows = [1, 2]; } as any, [], undefined,
                                         `<i ${S}></i><span nb-value="this.text"></span><div nb-repeat="this.rows"><s nb-project-to="r"></s></div>`,
                                         undefined, undefined, { shadowRootConfig: { mode: 'open' } } as any);
                const r = render(`<${tag}><b ${P}><u nb-value="this.outer"></u></b><q nb-projection="r"><u nb-value="this.outer"></u></q></${tag}>`);
                const shadow = (r.root.querySelector(tag) as any).shadowRoot as ShadowRoot;

                expect(texts(shadow, 'i b u')).toEqual(['OUTER']);
                expect(texts(shadow, 'span')).toEqual(['IN']);
                expect(texts(shadow, 's q u')).toEqual(['OUTER', 'OUTER']);

                r.host.outer = 'CHANGED';
                r.binder.detectChanges();
                jest.runAllTimers();
                expect(texts(shadow, 'i b u, s q u')).toEqual(['CHANGED', 'CHANGED', 'CHANGED']);
            });

            it('binds the projection as soon as an async component template resolves', async () => {
                const tag = `p-async-${++uid}`;
                let resolve: (html: string) => void = () => {};
                const provider = { get: () => new Promise<string>(r => { resolve = r; }) };
                Environment.addComponent(tag, class { outer = 'INNER'; } as any, [], undefined, provider as any,
                                         undefined, undefined, { shadowRootConfig: { mode: 'open' } } as any);
                const r = render(`<${tag}><b ${P}><u nb-value="this.outer"></u></b></${tag}>`);

                resolve(`<article ${S}></article>`);
                for (let i = 0; i < 10; i++) {
                    await Promise.resolve();
                    jest.runAllTimers();
                }

                const shadow = (r.root.querySelector(tag) as any).shadowRoot as ShadowRoot;
                expect(texts(shadow, 'article b u')).toEqual(['OUTER']);
            });
        });

        it('works in pessimistic mode', () => {
            const host = name('PPess');
            Environment.addContainer(host, class { outer = 'INNER'; } as any, [], `<article ${S}></article>`, undefined);

            const { root } = render(`<div nb-container="@${host}"><b ${P}><i nb-value="this.outer"></i></b></div>`, { outer: 'OUTER' }, true);

            expect(texts(root, 'article b i')).toEqual(['OUTER']);
            expect(errorSpy).not.toHaveBeenCalled();
        });
    });

    describe('encapsulation marker', () => {
        it('is set on projected clones only', () => {
            const host = name('PMark');
            Environment.addContainer(host, class {} as any, [], '<article nb-project-to=""></article>', undefined);
            const { root } = render(`<div nb-container="@${host}"><b nb-projection></b><i>fallback</i></div>`);

            expect(root.querySelector('article b')!.hasAttribute('nb-encapsulated')).toBe(true);
        });

        it('cannot be set through nb-attr', () => {
            const host = name('PMarkAttr');
            Environment.addContainer(host, class { t = 'T'; } as any, [], '<b nb-attr:nb-encapsulated="@x" nb-value="this.t"></b>', undefined);
            const { root } = render(`<div nb-container="@${host}"></div>`, { t: 'OUTER-T' });

            expect(root.querySelector('b')!.hasAttribute('nb-encapsulated')).toBe(false);
            expect(texts(root, 'b')).toEqual(['T']);
            expect(errorSpy).toHaveBeenCalledWith(expect.anything(), 'system (nb-encapsulated) attribute changes is not allowed');
        });

        it('uses data-nb-encapsulated in W3C mode', () => {
            Constants.changeCompliancyWithW3C(true);
            try {
                const host = name('PW3C');
                Environment.addContainer(host, class { outer = 'INNER'; } as any, [], '<article data-nb-project-to=""></article>', undefined);
                const { root } = render(`<div data-nb-container="@${host}"><b data-nb-projection><i data-nb-value="this.outer"></i></b></div>`);

                expect(texts(root, 'article b i')).toEqual(['OUTER']);
                expect(root.querySelector('article b')!.hasAttribute('data-nb-encapsulated')).toBe(true);
                expect(root.querySelector('[nb-encapsulated]')).toBeNull();
            } finally {
                Constants.changeCompliancyWithW3C(false);
            }
        });
    });
});

describe('Container fallback content (L-29)', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        errorSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    const fallbackHtml = '<div nb-container="this.name"><i nb-value="this.outer"></i></div>';

    it.each([
        ['an unknown name', 'NoSuchContainer'],
        ['an empty name from the first bind', ''],
        ['an undefined name', undefined],
    ])('builds and binds the fallback for %s', (_label, value) => {
        const { root } = render(fallbackHtml, { outer: 'OUTER', name: value });

        expect(texts(root, 'i')).toEqual(['OUTER']);
    });

    it('rebuilds the bound fallback when switching from a real container to an empty name', () => {
        const real = name('LReal');
        Environment.addContainer(real, class {} as any, [], '<p>real</p>', undefined);
        const r = render(fallbackHtml, { outer: 'OUTER', name: real });
        expect(texts(r.root, 'p')).toEqual(['real']);

        r.host.name = '';
        r.binder.detectChanges();
        jest.runAllTimers();

        expect(texts(r.root, 'i')).toEqual(['OUTER']);
    });

    it('an unresolved name builds the fallback once and keeps it (no per-cycle rebuild)', () => {
        const r = render(fallbackHtml + '<input>', { outer: 'OUTER', name: 'NoSuchContainer2' });
        const fallback = r.root.querySelector('i');

        for (let i = 0; i < 5; i++) {
            r.binder.detectChanges();
            jest.runAllTimers();
        }

        expect(r.root.querySelector('i')).toBe(fallback);
        expect(errorSpy.mock.calls.filter(call => call.some((arg: any) => String(arg).includes('not found'))).length).toBe(1);
    });

    it('A -> missing -> A renders A again', () => {
        const a = name('LA');
        Environment.addContainer(a, class {} as any, [], '<p>A</p>', undefined);
        const r = render(fallbackHtml, { outer: 'OUTER', name: a });

        r.host.name = 'LMissing';
        r.binder.detectChanges();
        jest.runAllTimers();
        expect(texts(r.root, 'i')).toEqual(['OUTER']);

        r.host.name = a;
        r.binder.detectChanges();
        jest.runAllTimers();
        expect(texts(r.root, 'p')).toEqual(['A']);
    });

    it('disposes a container nested in the fallback when the fallback is replaced or the binder is disposed', () => {
        const { counts, ctx } = lifecycleCounter();
        const nested = name('LNested');
        const real = name('LReal2');
        Environment.addContainer(nested, ctx as any, [], '<s>n</s>', undefined);
        Environment.addContainer(real, class {} as any, [], '<p>real</p>', undefined);
        const r = render(`<div nb-container="this.name"><span nb-container="@${nested}"></span></div>`, { name: '' });
        expect(counts).toEqual({ created: 1, disposed: 0 });

        r.host.name = real;
        r.binder.detectChanges();
        jest.runAllTimers();
        expect(counts).toEqual({ created: 1, disposed: 1 });

        r.host.name = '';
        r.binder.detectChanges();
        jest.runAllTimers();
        expect(counts).toEqual({ created: 2, disposed: 1 });

        r.binder.dispose();
        expect(counts).toEqual({ created: 2, disposed: 2 });
    });

    async function failingContainer() {
        const failing = name('LFailing');
        const get = jest.fn().mockRejectedValue(new Error('boom'));
        Environment.addContainer(failing, class {} as any, [], { get } as any, undefined);

        const r = render(`<div nb-container="@${failing}"><i nb-value="this.outer"></i></div>`);
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
            jest.runAllTimers();
        }

        return { ...r, get, failing };
    }

    it('a container whose template fetch keeps failing stops after 3 attempts and shows its fallback (no hang)', async () => {
        const { root, binder, get } = await failingContainer();

        expect(get).toHaveBeenCalledTimes(3);
        expect(root.querySelector('i')).not.toBeNull();
        expect(errorSpy.mock.calls.filter(call => call.some((arg: any) => String(arg).includes('unable to get HTML template'))).length).toBe(1);

        binder.detectChanges();
        jest.runAllTimers();
        expect(texts(root, 'i')).toEqual(['OUTER']);
    });

    // L-54 (fixed 2026-11-12): after the last failed fetch, Container.onCommit runs fallbackView() from the async
    // ready callback, outside any detection cycle; fallbackView() now requests an outer detection itself.
    it('binds that fallback without waiting for another outer cycle (L-54)', async () => {
        const { root } = await failingContainer();

        expect(texts(root, 'i')).toEqual(['OUTER']);
    });

    it('the detection requested for the fallback settles, no re-request loop (L-54)', async () => {
        const { root, binder } = await failingContainer();
        const passes = jest.spyOn(binder as any, 'processChangeDetection');

        for (let i = 0; i < 5; i++) {
            await Promise.resolve();
            jest.runAllTimers();
        }

        expect(passes).not.toHaveBeenCalled();
        expect(texts(root, 'i')).toEqual(['OUTER']);
    });

    it('a container element built after the attempts are used up shows its bound fallback (L-54)', async () => {
        const { get, failing } = await failingContainer();

        const r = render(`<div nb-container="@${failing}"><i nb-value="this.outer"></i></div>`, { outer: 'LATE' });
        await Promise.resolve();
        jest.runAllTimers();

        expect(get).toHaveBeenCalledTimes(3);
        expect(texts(r.root, 'i')).toEqual(['LATE']);
        expect(r.root.querySelector('[nb-container]')!.hasAttribute('nb-container-ready')).toBe(true);
    });

    // Cost note: a fallback built synchronously inside a pass (unknown / empty / undefined name) is already bound
    // by that pass; fallbackView()'s request then adds one more debounced outer pass. Harmless, not a loop.
    it('a synchronously built fallback is bound in the first pass and costs one extra debounced pass', () => {
        const root = document.createElement('div');
        root.innerHTML = fallbackHtml;
        document.body.appendChild(root);
        const binder = createBinder();
        const passes = jest.spyOn(binder as any, 'processChangeDetection');

        binder.bind(root, { outer: 'OUTER', name: 'NoSuchContainer3' } as any, true, false);
        expect(passes).toHaveBeenCalledTimes(1);
        expect(texts(root, 'i')).toEqual(['OUTER']);

        jest.runAllTimers();
        expect(passes).toHaveBeenCalledTimes(2);

        jest.runAllTimers();
        expect(passes).toHaveBeenCalledTimes(2);
    });
});

describe('nb-template fallback after a failed template load', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        errorSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    async function failingTemplate() {
        const tpl = name('TFailing');
        Environment.addTemplate(tpl, { get: jest.fn().mockRejectedValue(new Error('boom')) } as any, undefined);

        const r = render(`<div nb-template="@${tpl}"><i nb-value="this.outer"></i></div>`);
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
            jest.runAllTimers();
        }

        return r;
    }

    it('shows and binds the fallback content', async () => {
        const { root } = await failingTemplate();

        expect(texts(root, 'i')).toEqual(['OUTER']);
    });

    // L-55 (fixed 2026-11-12): Template.construct's fallback branch now calls markAsReady(), so the element no
    // longer matches [nb-template]:not([nb-template-ready]) in the processing-hide style (jsdom does not apply
    // that sheet, so the attribute is what is asserted).
    it('marks the element ready so the processing-hide style releases it (L-55)', async () => {
        const { root } = await failingTemplate();

        expect(root.querySelector('[nb-template]')!.hasAttribute('nb-template-ready')).toBe(true);
    });

    it('without fallback content the element is emptied and still marked ready (L-55)', async () => {
        const tpl = name('TFailingEmpty');
        Environment.addTemplate(tpl, { get: jest.fn().mockRejectedValue(new Error('boom')) } as any, undefined);

        const { root } = render(`<div nb-template="@${tpl}"></div>`);
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
            jest.runAllTimers();
        }

        const el = root.querySelector('[nb-template]')!;
        expect(el.childNodes.length).toBe(0);
        expect(el.hasAttribute('nb-template-ready')).toBe(true);
    });

    // L-56 (split out of L-55, fixed 2026-11-12): once the template has used up MAX_PREPARE_ATTEMPTS, tryPrepare()
    // returns false and registers no callback; Template.construct now runs fallbackView(false) in that branch, so
    // an element built after that point gets the same bound fallback as the earlier ones (and the same marker).
    async function exhaustedTemplateRoots(count: number) {
        const tpl = name('TExhausted');
        Environment.addTemplate(tpl, { get: jest.fn().mockRejectedValue(new Error('boom')) } as any, undefined);
        const html = `<div nb-template="@${tpl}"><i nb-value="this.outer"></i></div>`;
        const roots: Array<HTMLElement> = [];

        for (let k = 0; k < count; k++) {
            roots.push(render(html, { outer: `R${k}` }).root);
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
                jest.runAllTimers();
            }
        }

        return roots;
    }

    it('an element built after the attempts are used up shows its bound fallback (L-56)', async () => {
        const roots = await exhaustedTemplateRoots(5);

        roots.forEach((root, k) => expect(texts(root, 'i')).toEqual([`R${k}`]));
    });

    it('an element built after the attempts are used up is marked ready (L-56)', async () => {
        const roots = await exhaustedTemplateRoots(5);

        roots.forEach(root => expect(root.querySelector('[nb-template]')!.hasAttribute('nb-template-ready')).toBe(true));
    });
});
