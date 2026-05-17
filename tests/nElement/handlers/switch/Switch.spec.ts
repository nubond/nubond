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
        const attrs = new Attributes(el);
        const classes = new Classes(el, attrs, () => hideClassName);
        return { el, attrs, classes };
    }

    it('should detect expression from attribute', () => {
        const { attrs, classes } = createElements('ctx.currentTab');
        const handler = new Switch(attrs, classes);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
    });

    it('should have no expression when attribute missing', () => {
        const { attrs, classes } = createElements();
        const handler = new Switch(attrs, classes);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should be visible by default', () => {
        const { attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(attrs, classes);

        expect(handler.isVisible).toBe(true);
    });

    it('should set value when bound', () => {
        const { attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(attrs, classes);

        handler.bind(undefined, () => 'home');
        expect(handler.value).toBe('home');
    });

    it('should be dirty after bind sets value', () => {
        const { attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(attrs, classes);

        handler.bind(undefined, () => 'home');
        expect(handler.isDirty).toBe(true);
    });

    it('should return executionParams from bind', () => {
        const { attrs, classes } = createElements('ctx.tab');
        const handler = new Switch(attrs, classes);

        const params = { x: 1 } as any;
        expect(handler.bind(params, () => 'home')).toBe(params);
    });

    describe('addCase', () => {
        it('should return a removal function', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            const remove = handler.addCase(mockCase);

            expect(typeof remove).toBe('function');
        });

        it('should remove case when removal function is called', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

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
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const mockDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            const remove = handler.setDefault(mockDefault);

            expect(typeof remove).toBe('function');
        });

        it('should throw on duplicate default', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const mockDefault1 = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            const mockDefault2 = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;

            handler.setDefault(mockDefault1);
            expect(() => handler.setDefault(mockDefault2)).toThrow('default is already defined');
        });
    });

    describe('commit', () => {
        it('should call markAsReady on first commit', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const markAsReadySpy = jest.spyOn(attrs, 'markAsReady');
            const handler = new Switch(attrs, classes);

            handler.bind(undefined, () => 'home');
            handler.commit();

            expect(markAsReadySpy).toHaveBeenCalledWith(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);
        });

        it('should hide switch when no cases are visible and no default', () => {
            const { el, attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

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
            const handler = new Switch(attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.addCase(mockCase);

            handler.bind(undefined, () => 'home');
            handler.commit();
            classes.commit();

            expect(handler.isVisible).toBe(true);
        });

        it('should hide default when a case is visible, and show default when none visible', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

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
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

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
            const handler = new Switch(attrs, classes);

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
            const { attrs, classes } = createElements();
            const handler = new Switch(attrs, classes);

            // hasNExpression is false → isDirty is just _isDirty which is false
            expect(handler.commit()).toBe(false);
        });
    });

    describe('isDirty', () => {
        it('should return true when a case is dirty', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const dirtyCase = { isDirty: true, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            handler.addCase(dirtyCase);

            expect(handler.isDirty).toBe(true);
        });

        it('should return true when default is dirty', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const mockDefault = { isDirty: true, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.setDefault(mockDefault);

            expect(handler.isDirty).toBe(true);
        });

        it('should return false when there are no cases and no default (nothing to commit)', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            // No default set and no cases — there is nothing dirty to flush, so isDirty must be false.
            // (Earlier behavior incorrectly treated "missing default" as dirty; the new code only marks
            // dirty when a defined default actually reports isDirty.)
            expect(handler.isDirty).toBe(false);
        });

        it('should return false when default is defined but not dirty and no cases dirty', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const cleanDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            handler.setDefault(cleanDefault);

            expect(handler.isDirty).toBe(false);
        });
    });

    describe('addCase removal edge cases', () => {
        it('should handle double removal gracefully (index < 0)', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const mockCase = { isDirty: false, bind: jest.fn(), commit: jest.fn(), isVisible: false } as any;
            const remove = handler.addCase(mockCase);

            remove(); // first removal
            remove(); // second removal — index < 0, should not throw
        });
    });

    describe('setDefault removal', () => {
        it('should clear default with removal function', () => {
            const { attrs, classes } = createElements('ctx.tab');
            const handler = new Switch(attrs, classes);

            const mockDefault = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            const remove = handler.setDefault(mockDefault);

            remove();

            // After removal, adding another default should work
            const mockDefault2 = { isDirty: false, show: jest.fn(), hide: jest.fn(), commit: jest.fn(), isVisible: true } as any;
            expect(() => handler.setDefault(mockDefault2)).not.toThrow();
        });
    });

    it('bind should pass through executionParams unchanged when no expression', () => {
        const { attrs, classes } = createElements();
        const handler = new Switch(attrs, classes);

        const params = { foo: 'bar' } as any;
        const result = handler.bind(params, () => 'x');

        expect(result).toBe(params);
    });
});
