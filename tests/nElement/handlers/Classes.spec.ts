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
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression).toBeDefined();
            expect(handler.nExpression!.type).toBe('simple');
        });

        it('should detect condition expression', () => {
            const el = createElementWithAttr('{active: ctx.isActive, disabled: ctx.isDisabled}');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression!.type).toBe('condition');
        });

        it('should detect array expression', () => {
            const el = createElementWithAttr('[ctx.class1, ctx.class2]');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression!.type).toBe('array');
        });

        it('should have no expression when attribute missing', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.hasNExpression).toBe(false);
        });

        it('should preserve existing classes', () => {
            const el = createElementWithAttr(undefined, 'existing-class');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.has('existing-class')).toBe(true);
        });
    });

    describe('add/remove/has/toggle', () => {
        it('should add a class', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('test-class');
            expect(handler.has('test-class')).toBe(true);
            expect(handler.isDirty).toBe(true);
        });

        it('should not add duplicate class', () => {
            const el = document.createElement('div');
            el.className = 'existing';
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('existing');
            expect(handler.getAll().filter(c => c === 'existing').length).toBe(1);
        });

        it('should remove a class', () => {
            const el = document.createElement('div');
            el.className = 'to-remove';
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.remove('to-remove');
            expect(handler.has('to-remove')).toBe(false);
            expect(handler.isDirty).toBe(true);
        });

        it('should toggle a class', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.toggle('toggled');
            expect(handler.has('toggled')).toBe(true);

            handler.toggle('toggled');
            expect(handler.has('toggled')).toBe(false);
        });

        it('should toggle with targetExpression — swaps previous class for new class', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            const target = { previousValue: undefined as string | undefined };

            handler.toggle('alpha', target as any);
            expect(handler.has('alpha')).toBe(true);
            expect(target.previousValue).toBe('alpha');

            handler.toggle('beta', target as any);
            expect(handler.has('alpha')).toBe(false);
            expect(handler.has('beta')).toBe(true);
            expect(target.previousValue).toBe('beta');
        });

        it('should add empty string as no-op', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('');
            expect(handler.isDirty).toBe(false);
            expect(handler.getAll()).toEqual([]);
        });

        it('should getAll classes', () => {
            const el = document.createElement('div');
            el.className = 'a b c';
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            const all = handler.getAll();
            expect(all).toEqual(['a', 'b', 'c']);
        });

        it('should return a frozen array from getAll()', () => {
            const el = document.createElement('div');
            el.className = 'a b';
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            const all = handler.getAll();
            expect(Object.isFrozen(all)).toBe(true);
        });

        it('should return a snapshot from getAll() (subsequent add not reflected)', () => {
            const el = document.createElement('div');
            el.className = 'a';
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.hide();
            expect(handler.has(hideClassName)).toBe(true);
        });

        it('should remove hide class on show()', () => {
            const el = document.createElement('div');
            el.className = hideClassName;
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.show();
            expect(handler.has(hideClassName)).toBe(false);
        });
    });

    describe('bind with simple expression', () => {
        it('should toggle class based on expression result', () => {
            const el = createElementWithAttr('ctx.activeClass');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.bind(undefined, () => 'active');
            handler.commit();

            expect(el.className).toContain('active');
        });
    });

    describe('bind with condition expression', () => {
        it('should add class when condition is true', () => {
            const el = createElementWithAttr('{highlight: ctx.isHighlighted}');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.bind(undefined, () => true);
            handler.commit();

            expect(el.className).toContain('highlight');
        });

        it('should remove class when condition is false', () => {
            const el = createElementWithAttr('{highlight: ctx.isHighlighted}');
            el.className = 'highlight';
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.bind(undefined, () => false);
            handler.commit();

            expect(el.className).not.toContain('highlight');
        });
    });

    describe('bind with array expression', () => {
        it('should toggle each array expression result independently', () => {
            const el = createElementWithAttr('[this.cls1; this.cls2]');
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(el);
            new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('incorrect conditional class expression'));
        });

        it('should log error for condition expression without colon separator', () => {
            const el = createElementWithAttr('{badExpression}');
            const attrs = new Attributes(el);
            new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('incorrect conditional class expression'));
        });

        it('should log error for empty array expression', () => {
            const el = createElementWithAttr('[   ]');
            const attrs = new Attributes(el);
            new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('has empty value'));
        });

        it('should silently skip a fully whitespace condition expression set', () => {
            // After the L-1 trailing-semicolon fix, fully whitespace entries are filtered out
            // before reaching the per-entry error branches, so an all-whitespace block
            // produces no diagnostic and no bindings.
            const el = createElementWithAttr('{   }');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);
            expect(errorSpy).not.toHaveBeenCalled();
            const cond = handler.nExpression as { rawExpression: Map<string, unknown> };
            expect(cond.rawExpression.size).toBe(0);
        });

        it('should treat malformed bracket expression as simple (starts with { but no closing })', () => {
            // This exercises SimpleExpressionData.isThisType false branches
            const el = createElementWithAttr('{foo');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);
            // { without } doesn't match condition or array, falls through to simple
            expect(handler.hasNExpression).toBe(true);
        });

        it('should treat malformed square bracket expression as simple (starts with [ but no closing ])', () => {
            const el = createElementWithAttr('[foo');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);
            expect(handler.hasNExpression).toBe(true);
        });
    });

    describe('commit', () => {
        it('should update element className on commit', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            handler.add('new-class');
            handler.commit();

            expect(el.className).toBe('new-class');
        });

        it('should return false when not dirty', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Classes(el, attrs, () => hideClassName);

            expect(handler.commit()).toBe(false);
        });

        it('should update element className when same length but different contents', () => {
            const el = document.createElement('div');
            el.className = 'aaa bbb';
            const attrs = new Attributes(el);
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
            const attrs = new Attributes(svg);
            const handler = new Classes(svg, attrs, () => hideClassName);

            handler.add('alpha');
            handler.commit();

            expect(svg.getAttribute('class')).toBe('alpha');
        });

        it('should append multiple classes to SVG via class attribute', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const attrs = new Attributes(svg);
            const handler = new Classes(svg, attrs, () => hideClassName);

            handler.add('alpha');
            handler.add('beta');
            handler.commit();

            expect(svg.getAttribute('class')).toContain('alpha');
            expect(svg.getAttribute('class')).toContain('beta');
        });
    });
});
