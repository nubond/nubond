import { Styles } from '../../../src/nElement/handlers/Styles';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';

describe('Styles handler', () => {
    function createElementWithAttr(expression?: string): HTMLElement {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.STYLE_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    it('should detect style expression', () => {
        const el = createElementWithAttr('color: ctx.myColor; font-size: ctx.fontSize');
        const attrs = new Attributes(el, () => false);
        const handler = new Styles(el, attrs);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
        expect(handler.nExpression!.size).toBe(2);
        expect(handler.nExpression!.has('color')).toBe(true);
        expect(handler.nExpression!.has('font-size')).toBe(true);
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, () => false);
        const handler = new Styles(el, attrs);

        expect(handler.hasNExpression).toBe(false);
    });

    describe('get/set/has/remove', () => {
        it('should set and get a style', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            expect(handler.has('color')).toBe(true);
            expect(handler.get('color')).toBe('red');
            expect(handler.isDirty).toBe(true);
        });

        it('should remove a style', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'blue');
            handler.remove('color');
            expect(handler.has('color')).toBe(false);
        });

        it('should treat null/undefined as removal', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'blue');
            handler.set('color', null);
            expect(handler.has('color')).toBe(false);
        });

        it('should not mark as dirty when setting same value', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'green');
            handler.commit();
            handler.set('color', 'green');
            // Still dirty from initial set, but commit cleared it
            // Re-setting same value should not re-dirty
            expect(handler.isDirty).toBe(false);
        });

        it('should getAll styles', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            handler.set('font-size', '12px');
            const all = handler.getAll();
            expect(all.get('color')).toBe('red');
            expect(all.get('font-size')).toBe('12px');
        });

        it('should return a frozen Map from getAll()', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            const all = handler.getAll();
            expect(Object.isFrozen(all)).toBe(true);
        });

        it('should return a snapshot from getAll() (subsequent set not reflected)', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            const snapshot = handler.getAll();
            handler.set('font-size', '12px');

            expect(snapshot.has('font-size')).toBe(false);
            expect(handler.getAll().has('font-size')).toBe(true);
        });
    });

    describe('bind', () => {
        it('should bind expression to style properties', () => {
            const el = createElementWithAttr('color: ctx.myColor');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.bind(undefined, () => 'red');
            handler.commit();

            // The style.setProperty is called inside commit
            expect(el.style.getPropertyValue('color')).toBe('red');
        });

        it('should return executionParams', () => {
            const el = createElementWithAttr('color: ctx.c');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            const params = { x: 1 } as any;
            expect(handler.bind(params, () => 'blue')).toBe(params);
        });
    });

    describe('commit', () => {
        it('should return false when not dirty', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            expect(handler.commit()).toBe(false);
        });

        it('should remove a previously-set style on commit after removal', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('red');

            handler.remove('color');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('');
            expect(handler.has('color')).toBe(false);
        });

        it('should re-apply a style when its value changes between commits', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('red');

            // Change value — the previousValue is defined AND new value differs,
            // so the "value !== previousValue" branch fires and the DOM is updated.
            handler.set('color', 'blue');
            handler.commit();
            expect(el.style.getPropertyValue('color')).toBe('blue');
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

        it('should log error for whitespace-only style property name', () => {
            // Second style prop has only whitespace before the colon; after the per-entry trim
            // this collapses to ":value", which is reported as an incorrect style expression.
            const el = createElementWithAttr('color: ctx.val;  : ctx.val2');
            const attrs = new Attributes(el, () => false);
            new Styles(el, attrs);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('has incorrect style expression'));
        });

        it('should log error for expression without colon separator', () => {
            const el = createElementWithAttr('badExpression');
            const attrs = new Attributes(el, () => false);
            new Styles(el, attrs);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining('has incorrect style expression'));
        });
    });

    describe('set edge cases', () => {
        it('should treat empty string value as removal', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'blue');
            expect(handler.has('color')).toBe(true);

            handler.set('color', '');
            expect(handler.has('color')).toBe(false);
        });
    });

    describe('literal ";" handling and escaping', () => {
        let errorSpy: jest.SpyInstance;

        beforeEach(() => {
            errorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            errorSpy.mockRestore();
        });

        it('should keep an escaped ";" inside a value as a single style entry', () => {
            // `content: '\;'` must not split on the inner semicolon. The backslash is the
            // escape marker; it is stripped, leaving the literal ";" in the value.
            const el = createElementWithAttr("content: '\\;'");
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression!.size).toBe(1);
            expect(handler.nExpression!.get('content')!.expression).toBe("';'");
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should split on a real ";" while preserving an escaped ";" in an earlier value', () => {
            const el = createElementWithAttr("content: '\\;'; color: ctx.c");
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            expect(handler.nExpression!.size).toBe(2);
            expect(handler.nExpression!.get('content')!.expression).toBe("';'");
            expect(handler.nExpression!.has('color')).toBe(true);
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should not register an expression for an empty nb-style value', () => {
            // An empty/whitespace nb-style is rejected up-front by the Attributes layer
            // ("incorrect binding found ..."), so the value never reaches the Styles
            // tokenizer and no style expression is produced.
            const el = createElementWithAttr('');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            expect(handler.hasNExpression).toBe(false);
        });

        it('should not register an expression for a whitespace-only nb-style value', () => {
            const el = createElementWithAttr('   ');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            expect(handler.hasNExpression).toBe(false);
        });
    });

    describe('R2-8: "!important" in nb-style values', () => {
        it('should apply the "!important" flag as a CSS priority instead of writing it into the value', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red !important');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('red');
            expect(el.style.getPropertyPriority('color')).toBe('important');
        });

        it('should recognize the flag case-insensitively', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red !IMPORTANT');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('red');
            expect(el.style.getPropertyPriority('color')).toBe('important');
        });

        it('should recognize the flag without a space before it', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red!important');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('red');
            expect(el.style.getPropertyPriority('color')).toBe('important');
        });

        it('should keep a multi-token value intact when the flag is present', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('margin', '0px 4px 0px 4px !important');
            handler.commit();

            expect(el.style.getPropertyValue('margin')).toBe('0px 4px 0px 4px');
            expect(el.style.getPropertyPriority('margin')).toBe('important');
        });

        it('should apply the flag through the nb-style expression path', () => {
            const el = createElementWithAttr('color: ctx.myColor');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.bind(undefined, () => 'red !important');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('red');
            expect(el.style.getPropertyPriority('color')).toBe('important');
        });

        it('should drop the priority when the value later loses the flag', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red !important');
            handler.commit();
            expect(el.style.getPropertyPriority('color')).toBe('important');

            handler.set('color', 'red');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('red');
            expect(el.style.getPropertyPriority('color')).toBe('');
        });

        it('should clear value and priority when an important style is removed', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red !important');
            handler.commit();

            handler.remove('color');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('');
            expect(el.style.getPropertyPriority('color')).toBe('');
        });

        it('should not re-write the DOM when the same important value is set again', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red !important');
            handler.commit();

            handler.set('color', 'red !important');

            expect(handler.isDirty).toBe(false);
            expect(el.style.getPropertyPriority('color')).toBe('important');
        });

        it('should keep the raw flagged value in the handler model', () => {
            // The model holds the pre-split text; only the DOM write separates value from priority.
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red !important');
            handler.commit();

            expect(handler.get('color')).toBe('red !important');
            expect(handler.getAll().get('color')).toBe('red !important');
        });

        it('should not treat a value that is only the flag as a priority', () => {
            // A match at index 0 is ignored, so a lone flag stays an (invalid) plain value.
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', '!important');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('');
            expect(el.style.getPropertyPriority('color')).toBe('');
        });

        it('known gap: a space inside the flag is not recognized and the declaration is dropped', () => {
            // CSS allows whitespace between "!" and "important"; the handler matches the
            // contiguous token only, so this form is passed through as a plain value and
            // rejected by the CSS parser - the same silent no-op R2-8 described.
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red ! important');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('');
            expect(el.style.getPropertyPriority('color')).toBe('');
        });

        it('known gap: text after the flag is silently discarded instead of invalidating the declaration', () => {
            // A CSS parser rejects the whole declaration here; the handler cuts everything
            // from the flag on and applies the leading part as an important value.
            const el = document.createElement('div');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            handler.set('color', 'red !important foo');
            handler.commit();

            expect(el.style.getPropertyValue('color')).toBe('red');
            expect(el.style.getPropertyPriority('color')).toBe('important');
        });

        it('known gap: a pre-existing inline important declaration is not cleared by a plain bound value', () => {
            // The constructor seeds _previousStyles from getPropertyValue(), which drops the
            // priority, so a binding yielding the same text as the existing value looks
            // unchanged: nothing is committed and the inline priority survives.
            const el = createElementWithAttr('color: ctx.myColor');
            el.setAttribute('style', 'color: red !important');
            const attrs = new Attributes(el, () => false);
            const handler = new Styles(el, attrs);

            // The seeded previous value is the flag-less "red", so a bound "red" looks unchanged.
            handler.bind(undefined, () => 'red');
            handler.commit();

            expect(handler.isDirty).toBe(false);
            expect(el.style.getPropertyPriority('color')).toBe('important');
        });
    });
});
