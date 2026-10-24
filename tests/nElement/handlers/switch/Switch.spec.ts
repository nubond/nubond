import { Switch } from '../../../../src/nElement/handlers/switch/Switch';
import { Attributes } from '../../../../src/nElement/handlers/Attributes';
import { Classes } from '../../../../src/nElement/handlers/Classes';
import { Constants } from '../../../../src/Constants';

describe('Switch handler', () => {
    const hideClassName = 'nb-hidden';

    function createElements(expression?: string): { el: Element; attrs: Attributes; classes: Classes } {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        const attrs = new Attributes(el, () => false);
        const classes = new Classes(el, attrs, () => hideClassName);
        return { el, attrs, classes };
    }

    it('should detect expression from attribute', () => {
        const { el, attrs, classes } = createElements('ctx.currentTab');
        const handler = new Switch(el, attrs, classes);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression when attribute missing', () => {
        const { el, attrs, classes } = createElements();
        const handler = new Switch(el, attrs, classes);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should be visible by default', () => {
        const { el, attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(el, attrs, classes);

        expect(handler.isVisible).toBe(true);
    });

    it('should set value when bound', () => {
        const { el, attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(el, attrs, classes);

        handler.bind(undefined, () => 'home');
        expect(handler.value).toBe('home');
    });

    it('should be dirty after bind sets value', () => {
        const { el, attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(el, attrs, classes);

        handler.bind(undefined, () => 'home');
        expect(handler.isDirty).toBe(true);
    });

    it('should return executionParams from bind', () => {
        const { el, attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(el, attrs, classes);

        const params = { x: 1 } as any;
        expect(handler.bind(params, () => 'home')).toBe(params);
    });

    describe('addCase', () => {
        it('should return a removal function', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            const remove = handler.addCase(mockCase);

            expect(typeof remove).toBe('function');
        });

        it('should remove case when removal function is called', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            const remove = handler.addCase(mockCase);

            // Bind and commit to set up state; the case should participate in commit
            handler.bind(undefined, () => 'x');
            handler.commit();

            // Verify commit was called on the case
            expect(mockCase.commit).toHaveBeenCalled();
            mockCase.commit.mockClear();

            // Remove the case
            remove();

            // Bind and commit again - the removed case's commit should not be called again
            handler.bind(undefined, () => 'y');
            handler.commit();
            expect(mockCase.commit).not.toHaveBeenCalled();
        });
    });

    describe('setDefault', () => {
        it('should accept a default', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            const remove = handler.setDefault(mockDefault);

            expect(typeof remove).toBe('function');
        });

        it('should throw on duplicate default', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockDefault1 = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            const mockDefault2 = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;

            handler.setDefault(mockDefault1);
            expect(() => handler.setDefault(mockDefault2)).toThrow('default is already defined');
        });
    });

    describe('commit', () => {
        it('should set the ready attribute directly on the element on first commit', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);
            const readyAttr = `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_HANDLER_ATTRIBUTE_NAME}${Constants.DEFAULT_SEPARATOR}${Constants.HANDLER_READY_ATTRIBUTE_SUFFIX}`;

            handler.bind(undefined, () => 'home');
            expect(el.hasAttribute(readyAttr)).toBe(false);

            handler.commit();

            // no Attributes.commit() is needed any more — the handler writes the marker itself
            expect(el.getAttribute(readyAttr)).toBe('');
            expect(attrs.isDirty).toBe(false);
        });

        it('should hide switch when no cases are visible and no default', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            handler.addCase(mockCase);

            handler.bind(undefined, () => 'home');
            handler.commit();
            classes.commit();

            expect(el.className).toContain(hideClassName);
            expect(handler.isVisible).toBe(false);
        });

        it('should show switch when a case becomes visible', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.addCase(mockCase);

            handler.bind(undefined, () => 'home');
            handler.commit();
            classes.commit();

            expect(handler.isVisible).toBe(true);
        });

        it('should hide default when a case is visible, and show default when none visible', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.setDefault(mockDefault);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.addCase(mockCase);

            handler.bind(undefined, () => 'home');
            handler.commit();

            // Case is visible → default should be hidden
            expect(mockDefault.hide).toHaveBeenCalled();
            expect(mockDefault.commit).toHaveBeenCalled();
        });

        it('should show default when no cases are visible', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.setDefault(mockDefault);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            handler.addCase(mockCase);

            handler.bind(undefined, () => 'none');
            handler.commit();

            // No case visible → default should be shown
            expect(mockDefault.show).toHaveBeenCalled();
        });

        it('should toggle visibility from hidden to visible', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            handler.addCase(mockCase);

            // First commit — hidden
            handler.bind(undefined, () => 'x');
            handler.commit();
            classes.commit();
            expect(handler.isVisible).toBe(false);

            // Second commit — visible
            mockCase.isVisible = true;
            handler.bind(undefined, () => 'y');
            handler.commit();
            classes.commit();
            expect(handler.isVisible).toBe(true);
        });

        it('should return false when not dirty and hasNExpression is false', () => {
            const { el, attrs, classes } = createElements();
            const handler = new Switch(el, attrs, classes);

            // hasNExpression is false → isDirty is just _isDirty which is false
            expect(handler.commit()).toBe(false);
        });
    });

    describe('isDirty', () => {
        it('should return true when a case is dirty', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const dirtyCase = { isDirty: true, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            handler.addCase(dirtyCase);

            expect(handler.isDirty).toBe(true);
        });

        it('should return true when default is dirty', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockDefault = { isDirty: true, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.setDefault(mockDefault);

            expect(handler.isDirty).toBe(true);
        });

        it('should return false when there are no cases and no default (nothing to commit)', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            // No default set and no cases — there is nothing dirty to flush, so isDirty must be false.
            // (Earlier behavior incorrectly treated "missing default" as dirty; the new code only marks
            // dirty when a defined default actually reports isDirty.)
            expect(handler.isDirty).toBe(false);
        });

        it('should return false when default is defined but not dirty and no cases dirty', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const cleanDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.setDefault(cleanDefault);

            expect(handler.isDirty).toBe(false);
        });
    });

    describe('addCase removal edge cases', () => {
        it('should handle double removal gracefully (index < 0)', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            const remove = handler.addCase(mockCase);

            remove(); // first removal
            remove(); // second removal — index < 0, should not throw
        });

        // The removal function must take out its own case whatever was removed before it; a
        // position captured at addCase() time goes stale as soon as an earlier case is removed.
        function addCases(): { handler: Switch; cases: Array<any>; removals: Array<() => void> } {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);
            const cases = ['first', 'second', 'third'].map(name =>
                ({ name, isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any));

            return { handler, cases, removals: cases.map(el => handler.addCase(el)) };
        }

        function registered(handler: Switch): Array<string> {
            return (handler as any)._cases.map((el: any) => el.name);
        }

        it('should remove the right cases when they are removed in registration order', () => {
            const { handler, removals } = addCases();

            removals[0]();
            removals[1]();

            expect(registered(handler)).toEqual(['third']);
        });

        it('should not remove another case when a removal function is called twice', () => {
            const { handler, removals } = addCases();

            removals[0]();
            removals[0]();

            expect(registered(handler)).toEqual(['second', 'third']);
        });

        it('should end up empty when every case is removed in registration order', () => {
            const { handler, removals } = addCases();

            removals.forEach(remove => remove());

            expect(registered(handler)).toEqual([]);
        });
    });

    describe('setDefault removal', () => {
        it('should clear default with removal function', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(el, attrs, classes);

            const mockDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            const remove = handler.setDefault(mockDefault);

            remove();

            // After removal, adding another default should work
            const mockDefault2 = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            expect(() => handler.setDefault(mockDefault2)).not.toThrow();
        });
    });

    it('bind should pass through executionParams unchanged when no expression', () => {
        const { el, attrs, classes } = createElements();
        const handler = new Switch(el, attrs, classes);

        const params = { foo: 'bar' } as any;
        const result = handler.bind(params, () => 'x');

        expect(result).toBe(params);
    });
});
