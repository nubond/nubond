import { Classes } from '../../../src/nElement/handlers/Classes';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

describe('Classes handler', () => {
    const hideClassName = 'nb-hidden';

    function createElementWithAttr(expression?: string, existingClasses?: string): Element {
        const el = document.createElement('div');
        if (existingClasses) {
            el.className = existingClasses;
        }
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.CLASS_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    describe('constructor', () => {
        it('should detect simple expression', () => {
            const el = createElementWithAttr('ctx.myClass');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression).toBeDefined();
            expect(handler.nExpression!.type).toBe('simple');
        });

        it('should detect condition expression', () => {
            const el = createElementWithAttr('{active: ctx.isActive, disabled: ctx.isDisabled}');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression!.type).toBe('condition');
        });

        it('should detect array expression', () => {
            const el = createElementWithAttr('[ctx.class1, ctx.class2]');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression!.type).toBe('array');
        });

        it('should have no expression when attribute missing', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(false);
        });

        it('should preserve existing classes', () => {
            const el = createElementWithAttr(undefined, 'existing-class');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.has('existing-class')).toBe(true);
        });
    });

    describe('add/remove/has/toggle', () => {
        it('should add a class', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('test-class');
            expect(handler.has('test-class')).toBe(true);
            expect(handler.isDirty).toBe(true);
        });

        it('should not add duplicate class', () => {
            const el = document.createElement('div');
            el.className = 'existing';
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('existing');
            expect(handler.getAll().filter(c => c === 'existing').length).toBe(1);
        });

        it('should remove a class', () => {
            const el = document.createElement('div');
            el.className = 'to-remove';
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.remove('to-remove');
            expect(handler.has('to-remove')).toBe(false);
            expect(handler.isDirty).toBe(true);
        });

        it('should toggle a class', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.toggle('toggled');
            expect(handler.has('toggled')).toBe(true);

            handler.toggle('toggled');
            expect(handler.has('toggled')).toBe(false);
        });

        // The replace-previous-class behaviour moved from the public toggle(className, target) into the
        // protected toggleInternal used by bind; public toggle(className) is a plain flip again.
        it('should swap the previous class for the new one when a simple nb-class value changes', () => {
            const el = createElementWithAttr('this.cls');
            const handler = new Classes(el, new Attributes(el, () => false), () => hideClassName);

            handler.bind(undefined, () => 'alpha');
            handler.commit();
            expect(handler.has('alpha')).toBe(true);

            handler.bind(undefined, () => 'beta');
            handler.commit();
            expect(handler.has('alpha')).toBe(false);
            expect(handler.has('beta')).toBe(true);
            expect(el.className).toBe('beta');

            // re-evaluating the same value keeps the class (no flip)
            handler.bind(undefined, () => 'beta');
            handler.commit();
            expect(el.className).toBe('beta');
        });

        it('should add empty string as no-op', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('');
            expect(handler.isDirty).toBe(false);
            expect(handler.getAll()).toEqual([]);
        });

        it('should getAll classes', () => {
            const el = document.createElement('div');
            el.className = 'a b c';
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            const all = handler.getAll();
            expect(all).toEqual(['a', 'b', 'c']);
        });

        it('should return a frozen array from getAll()', () => {
            const el = document.createElement('div');
            el.className = 'a b';
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            const all = handler.getAll();
            expect(Object.isFrozen(all)).toBe(true);
        });

        it('should return a snapshot from getAll() (subsequent add not reflected)', () => {
            const el = document.createElement('div');
            el.className = 'a';
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            const snapshot = handler.getAll();
            handler.add('b');

            expect(snapshot).toEqual(['a']);
            expect(handler.getAll()).toEqual(['a', 'b']);
        });
    });

    describe('show/hide', () => {
        it('should add hide class on hide()', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(true);
        });

        it('should remove hide class on show()', () => {
            const el = document.createElement('div');
            el.className = hideClassName;
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.show(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(false);
        });
    });

    describe('R2-3: hidden class is refcounted per requesting handler', () => {
        function createHandler(): Classes {
            const el = document.createElement('div');
            return new Classes(el, new Attributes(el, () => false), () => hideClassName);
        }

        it('should keep the hide class while another handler still requires it hidden', () => {
            const handler = createHandler();

            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.hide(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);

            handler.show(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(true);

            handler.show(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(false);
        });

        it('should keep the hide class when the last hiding handler is not the first one to show', () => {
            const handler = createHandler();

            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.hide(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);

            handler.show(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(true);

            handler.show(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(false);
        });

        it('should treat repeated hide() calls from the same handler as one', () => {
            const handler = createHandler();

            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);

            handler.show(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(false);
        });

        it('should ignore show() from a handler that never hid the element', () => {
            const handler = createHandler();

            handler.hide(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);

            handler.show(Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(true);

            handler.show(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(false);
        });

        it('should support three visibility handlers on one element', () => {
            const handler = createHandler();

            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.hide(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);
            handler.hide(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);

            handler.show(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.show(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(true);

            handler.show(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);
            expect(handler.has(hideClassName)).toBe(false);
        });
    });

    describe('bind with simple expression', () => {
        it('should toggle class based on expression result', () => {
            const el = createElementWithAttr('ctx.activeClass');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.bind(undefined, () => 'active');
            handler.commit();

            expect(el.className).toContain('active');
        });
    });

    describe('bind with condition expression', () => {
        it('should add class when condition is true', () => {
            const el = createElementWithAttr('{highlight: ctx.isHighlighted}');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.bind(undefined, () => true);
            handler.commit();

            expect(el.className).toContain('highlight');
        });

        it('should remove class when condition turns false', () => {
            const el = createElementWithAttr('{highlight: ctx.isHighlighted}');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.bind(undefined, () => true);
            handler.commit();
            expect(el.className).toContain('highlight');

            handler.bind(undefined, () => false);
            handler.commit();

            expect(el.className).not.toContain('highlight');
        });
    });

    describe('bind with array expression', () => {
        it('should toggle each array expression result independently', () => {
            const el = createElementWithAttr('[this.cls1; this.cls2]');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            let callIndex = 0;
            handler.bind(undefined, () => {
                callIndex++;
                return callIndex === 1 ? 'foo' : 'bar';
            });
            handler.commit();

            expect(el.className).toContain('foo');
            expect(el.className).toContain('bar');
        });
    });

    describe('R8-5: array entries share a class instead of removing it from each other', () => {
        // Every entry is evaluated first; an entry may then drop its previous class only when no
        // entry yields it this cycle. Pre-fix, a LATER entry moving away from a shared class removed
        // it after the earlier entry had already (no-op) re-added it, losing the class for a cycle.
        function createArrayHandler(expression: string, existingClasses?: string) {
            const el = createElementWithAttr(expression, existingClasses);
            const handler = new Classes(el, new Attributes(el, () => false), () => hideClassName);
            const state: Record<string, any> = {};

            const cycle = (): string[] => {
                handler.bind(undefined, (expr: string | null | undefined) => state[expr!.replace('this.', '')]);
                handler.commit();
                return el.className.split(/\s+/).filter(name => name.length > 0).sort();
            };

            return { el, state, cycle };
        }

        it('should keep a shared class when the later entry moves away from it', () => {
            const { state, cycle } = createArrayHandler('[this.a; this.b]');

            state.a = 'x'; state.b = 'x';
            expect(cycle()).toEqual(['x']);

            state.b = 'z';
            expect(cycle()).toEqual(['x', 'z']);
        });

        it('should keep a shared class when the earlier entry moves away from it', () => {
            const { state, cycle } = createArrayHandler('[this.a; this.b]');

            state.a = 'x'; state.b = 'x';
            cycle();

            state.a = 'z';
            expect(cycle()).toEqual(['x', 'z']);
        });

        it('should drop the class once the last entry yielding it moves away', () => {
            const { state, cycle } = createArrayHandler('[this.a; this.b]');

            state.a = 'x'; state.b = 'x';
            cycle();
            state.b = 'z';
            cycle();

            state.a = 'q';
            expect(cycle()).toEqual(['q', 'z']);
        });

        it('should drop a shared class when both entries leave it in the same cycle', () => {
            const { state, cycle } = createArrayHandler('[this.a; this.b]');

            state.a = 'x'; state.b = 'x';
            cycle();

            state.a = 'z'; state.b = 'z';
            expect(cycle()).toEqual(['z']);
        });

        it('should keep both classes when two entries swap values', () => {
            const { state, cycle } = createArrayHandler('[this.a; this.b]');

            state.a = 'm'; state.b = 'n';
            cycle();

            state.a = 'n'; state.b = 'm';
            expect(cycle()).toEqual(['m', 'n']);
        });

        it('should remove only its own class when an entry becomes undefined', () => {
            const { state, cycle } = createArrayHandler('[this.a; this.b]');

            state.a = 'm'; state.b = 'n';
            cycle();

            state.a = undefined;
            expect(cycle()).toEqual(['n']);
        });

        // a one-time (#) entry is skipped after its first result; the skip callback contributes its
        // frozen class to this cycle's set, so a later entry leaving the same class cannot remove it
        it('should keep a class still yielded by a one-time entry', () => {
            const { state, cycle } = createArrayHandler('[#this.a; this.b]');

            state.a = 'x'; state.b = 'x';
            cycle();

            state.b = 'z';
            expect(cycle()).toEqual(['x', 'z']);
            expect(cycle()).toEqual(['x', 'z']);
        });

        it('should keep a one-time entry\'s class frozen while other entries change', () => {
            const { state, cycle } = createArrayHandler('[#this.a; this.b]');

            state.a = 'x'; state.b = 'y';
            cycle();

            state.a = 'ignored'; state.b = 'z';
            expect(cycle()).toEqual(['x', 'z']);
        });

        it('should still drop a plain entry\'s class when only a one-time entry used a different one', () => {
            const { state, cycle } = createArrayHandler('[#this.a; this.b]');

            state.a = 'x'; state.b = 'y';
            cycle();

            state.b = 'z';
            expect(cycle()).toEqual(['x', 'z']);
        });

        it('should keep an authored class equal to an array entry\'s previous value', () => {
            const { state, cycle } = createArrayHandler('[this.a]', 'x static');

            state.a = 'x';
            expect(cycle()).toEqual(['static', 'x']);

            state.a = 'y';
            expect(cycle()).toEqual(['static', 'x', 'y']);
        });

        it('should keep an authored class equal to a simple nb-class previous value', () => {
            const { state, cycle } = createArrayHandler('this.a', 'x static');

            state.a = 'x';
            expect(cycle()).toEqual(['static', 'x']);

            state.a = 'y';
            expect(cycle()).toEqual(['static', 'x', 'y']);

            state.a = 'z';
            expect(cycle()).toEqual(['static', 'x', 'z']);
        });
    });

    describe('condition expression: key validation', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        function createConditionHandler(expression: string, existingClasses?: string) {
            const el = createElementWithAttr(expression, existingClasses);
            const handler = new Classes(el, new Attributes(el, () => false), () => hideClassName);
            return { el, handler };
        }

        function keys(handler: Classes): string[] {
            return [...(<Map<string, any>>handler.nExpression!.rawExpression).keys()];
        }

        it('should keep the first entry and log an error naming a duplicated class name', () => {
            const { el, handler } = createConditionHandler('{on: this.first; on: this.second}');

            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('duplicated class name (on) found'));
            expect([...(<Map<string, any>>handler.nExpression!.rawExpression).keys()]).toEqual(['on']);

            handler.bind(undefined, (expr: string | null | undefined) => expr === 'this.first');
            handler.commit();

            expect(el.classList.contains('on')).toBe(true);
        });

        it('should detect a duplicate after trimming whitespace around the class name', () => {
            const { el } = createConditionHandler('{ on : this.first; on: this.second }');

            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('duplicated class name (on) found'));
        });

        // Authored (static) classes are never mutated by nb-class (R8-5 follow-up): a conditional key
        // naming a class already present in the markup is rejected at construction, so it is never bound.
        it('should reject a key that names an authored class and keep the class', () => {
            const { el, handler } = createConditionHandler('{highlight: this.on; extra: this.on}', 'highlight');

            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el,
                                                  expect.stringContaining('conditional class expression can\'t mutate static (highlight) class'));
            expect(keys(handler)).toEqual(['extra']);

            handler.bind(undefined, () => false);
            handler.commit();
            expect(el.className).toBe('highlight');

            handler.bind(undefined, () => true);
            handler.commit();
            expect(el.className.split(' ').sort()).toEqual(['extra', 'highlight']);

            handler.bind(undefined, () => false);
            handler.commit();
            expect(el.className).toBe('highlight');
        });

        it('should reject an authored-class key after trimming, case-sensitively', () => {
            const { handler } = createConditionHandler('{ base : this.on; Base: this.on}', 'base');

            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(keys(handler)).toEqual(['Base']);
        });

        it('should bind no keys when every key names an authored class', () => {
            const { el, handler } = createConditionHandler('{a: this.on; b: this.on}', 'a b');

            expect(errorSpy).toHaveBeenCalledTimes(2);
            expect(keys(handler)).toEqual([]);

            handler.bind(undefined, () => false);
            handler.commit();
            expect(el.className).toBe('a b');
        });

        it('should not reject keys on an element without authored classes', () => {
            const { handler } = createConditionHandler('{a: this.on; b: this.on}');

            expect(errorSpy).not.toHaveBeenCalled();
            expect(keys(handler)).toEqual(['a', 'b']);
        });

        it('should treat class names that differ only by case as distinct', () => {
            const { el, handler } = createConditionHandler('{On: this.first; on: this.second}');

            expect(errorSpy).not.toHaveBeenCalled();
            expect([...(<Map<string, any>>handler.nExpression!.rawExpression).keys()]).toEqual(['On', 'on']);

            handler.bind(undefined, () => true);
            handler.commit();

            expect(el.className.split(' ').sort()).toEqual(['On', 'on']);
        });
    });

    describe('constructor error paths', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        it('should log error for condition expression with whitespace-only class name', () => {
            // Second entry has spaces before colon. After the per-entry trim it collapses to
            // ':ctx.isActive', which is reported as an incorrect conditional class expression.
            const el = createElementWithAttr('{active: ctx.x;  :ctx.isActive}');
            const attrs = new Attributes(el, () => false);
            new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('incorrect conditional class expression'));
        });

        it('should log error for condition expression without colon separator', () => {
            const el = createElementWithAttr('{badExpression}');
            const attrs = new Attributes(el, () => false);
            new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('incorrect conditional class expression'));
        });

        it('should log error for empty array expression', () => {
            const el = createElementWithAttr('[   ]');
            const attrs = new Attributes(el, () => false);
            new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('has empty value'));
        });

        it('should log an error for an empty/whitespace condition expression set', () => {
            // Helpers.split returns [] for a whitespace-only block (the old
            // String.split(';') always yielded ['']), so the "empty conditions set" branch
            // is now reachable — symmetric with the array form, where `[   ]` reports
            // "has empty value". No bindings are produced.
            const el = createElementWithAttr('{   }');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('has empty conditions set'));
            const cond = handler.nExpression as { rawExpression: Map<string, unknown> };
            expect(cond.rawExpression.size).toBe(0);
        });

        it('should treat malformed bracket expression as simple (starts with { but no closing })', () => {
            // This exercises SimpleExpressionData.isThisType false branches
            const el = createElementWithAttr('{foo');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);
            // { without } doesn't match condition or array, falls through to simple
            expect(handler.hasNExpression).toBe(true);
        });

        it('should treat malformed square bracket expression as simple (starts with [ but no closing ])', () => {
            const el = createElementWithAttr('[foo');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);
            expect(handler.hasNExpression).toBe(true);
        });
    });

    describe('escaping ";" inside expressions', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        it('should keep an escaped ";" inside a condition value as a single entry', () => {
            // `{label: this.fn('a\;b')}` must not split on the semicolon inside the string
            // literal. The backslash is the escape marker and is stripped from the value.
            const el = createElementWithAttr("{label: this.fn('a\\;b')}");
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.nExpression!.type).toBe('condition');
            const cond = handler.nExpression as unknown as { rawExpression: Map<string, { expression: string }> };
            expect(cond.rawExpression.size).toBe(1);
            expect(cond.rawExpression.get('label')!.expression).toBe("this.fn('a;b')");
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should keep an escaped ";" inside an array entry as a single entry', () => {
            const el = createElementWithAttr("[this.fn('a\\;b')]");
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.nExpression!.type).toBe('array');
            const arr = handler.nExpression as unknown as { rawExpression: Array<{ expression: string }> };
            expect(arr.rawExpression.length).toBe(1);
            expect(arr.rawExpression[0].expression).toBe("this.fn('a;b')");
            expect(errorSpy).not.toHaveBeenCalled();
        });
    });

    describe('commit', () => {
        it('should update element className on commit', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('new-class');
            handler.commit();

            expect(el.className).toBe('new-class');
        });

        it('should return false when not dirty', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.commit()).toBe(false);
        });

        it('should update element className when same length but different contents', () => {
            const el = document.createElement('div');
            el.className = 'aaa bbb';
            const attrs = new Attributes(el, () => false);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.remove('bbb');
            handler.add('ccc');
            handler.commit();

            expect(el.className).toBe('aaa ccc');
        });
    });

    describe('M-32: SVG element class handling', () => {
        // For SVG elements, Element.className is a SVGAnimatedString; assigning a plain string
        // creates a JS property that does NOT update the rendered `class` attribute. The fix
        // routes SVG writes through setAttribute('class', ...).
        it('should write to the SVG class attribute via setAttribute', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.CLASS_HANDLER_ATTRIBUTE_NAME}`, 'ctx.cls');
            const attrs = new Attributes(svg, () => false);
            const handler = new Classes(svg, attrs, () => hideClassName);

            handler.add('alpha');
            handler.commit();

            expect(svg.getAttribute('class')).toBe('alpha');
        });

        it('should append multiple classes to SVG via class attribute', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const attrs = new Attributes(svg, () => false);
            const handler = new Classes(svg, attrs, () => hideClassName);

            handler.add('alpha');
            handler.add('beta');
            handler.commit();

            expect(svg.getAttribute('class')).toContain('alpha');
            expect(svg.getAttribute('class')).toContain('beta');
        });
    });

    describe('#6: SVG elements keep their pre-existing classes', () => {
        // `className` on an SVGElement is an SVGAnimatedString, so the read path must go through
        // getAttribute('class') — reading `.className.length` initialized the model as empty and
        // the first write wiped the authored classes.
        function createSvg(existingClasses?: string, expression?: string): SVGElement {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            if (existingClasses !== undefined) {
                svg.setAttribute('class', existingClasses);
            }
            if (expression !== undefined) {
                svg.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.CLASS_HANDLER_ATTRIBUTE_NAME}`, expression);
            }
            return svg;
        }

        it('should seed the model with the authored SVG classes', () => {
            const svg = createSvg('icon icon-large');
            const handler = new Classes(svg, new Attributes(svg, () => false), () => hideClassName);

            expect(handler.getAll()).toEqual(['icon', 'icon-large']);
            expect(handler.has('icon')).toBe(true);
            expect(handler.has('icon-large')).toBe(true);
        });

        it('should keep the authored SVG classes when hide() writes the class attribute', () => {
            const svg = createSvg('icon icon-large');
            const handler = new Classes(svg, new Attributes(svg, () => false), () => hideClassName);

            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.commit();

            expect(svg.getAttribute('class')).toBe(`icon icon-large ${hideClassName}`);
        });

        it('should restore the authored SVG classes after hide() then show()', () => {
            const svg = createSvg('icon icon-large');
            const handler = new Classes(svg, new Attributes(svg, () => false), () => hideClassName);

            handler.hide(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.commit();
            handler.show(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            handler.commit();

            expect(svg.getAttribute('class')).toBe('icon icon-large');
        });

        it('should append a bound class to the authored SVG classes', () => {
            const svg = createSvg('icon', 'ctx.cls');
            const handler = new Classes(svg, new Attributes(svg, () => false), () => hideClassName);

            handler.add('active');
            handler.commit();

            expect(svg.getAttribute('class')).toBe('icon active');
        });

        it('should remove an authored SVG class on request', () => {
            const svg = createSvg('icon icon-large');
            const handler = new Classes(svg, new Attributes(svg, () => false), () => hideClassName);

            handler.remove('icon');
            handler.commit();

            expect(svg.getAttribute('class')).toBe('icon-large');
        });

        it('should treat a missing class attribute on SVG as no classes', () => {
            const svg = createSvg();
            const handler = new Classes(svg, new Attributes(svg, () => false), () => hideClassName);

            expect(handler.getAll()).toEqual([]);
        });

        it('should ignore a whitespace-only class attribute on SVG', () => {
            const svg = createSvg('   ');
            const handler = new Classes(svg, new Attributes(svg, () => false), () => hideClassName);

            expect(handler.getAll()).toEqual([]);
        });

        it('should still seed the model from a plain HTML element className', () => {
            const el = createElementWithAttr(undefined, 'alpha beta');
            const handler = new Classes(el, new Attributes(el, () => false), () => hideClassName);

            expect(handler.getAll()).toEqual(['alpha', 'beta']);
        });
    });
});
