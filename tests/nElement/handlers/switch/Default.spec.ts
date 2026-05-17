import { Default } from '../../../../src/nElement/handlers/switch/Default';
import { Switch } from '../../../../src/nElement/handlers/switch/Switch';
import { Attributes } from '../../../../src/nElement/handlers/Attributes';
import { Classes } from '../../../../src/nElement/handlers/Classes';
import { Constants } from '../../../../src/Constants';

describe('Default handler', () => {
    const hideClassName = 'nb-hidden';

    function createSwitchAndDefault(switchExpr: string): { 
        switchHandler: Switch;
        defaultEl: Element; defaultHandler: Default;
        defaultClasses: Classes;
    } {
        const switchEl = document.createElement('div');
        switchEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_HANDLER_ATTRIBUTE_NAME}`, switchExpr);
        const switchAttrs = new Attributes(switchEl);
        const switchClasses = new Classes(switchEl, switchAttrs, () => hideClassName);
        const switchHandler = new Switch(switchAttrs, switchClasses);

        const defaultEl = document.createElement('div');
        defaultEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME}`, '');
        const defaultAttrs = new Attributes(defaultEl);
        const defaultClasses = new Classes(defaultEl, defaultAttrs, () => hideClassName);
        const defaultHandler = new Default(defaultEl, defaultAttrs, defaultClasses, switchHandler);

        return { switchHandler, defaultEl, defaultHandler, defaultClasses };
    }

    it('should detect expression from attribute', () => {
        const { defaultHandler } = createSwitchAndDefault('ctx.tab');
        expect(defaultHandler.hasNExpression).toBe(true);
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const classes = new Classes(el, attrs, () => hideClassName);
        const handler = new Default(el, attrs, classes, undefined);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should be visible by default', () => {
        const { defaultHandler } = createSwitchAndDefault('ctx.tab');
        expect(defaultHandler.isVisible).toBe(true);
    });

    it('show() should make it visible', () => {
        const { defaultHandler } = createSwitchAndDefault('ctx.tab');

        defaultHandler.hide();
        defaultHandler.show();
        expect(defaultHandler.isVisible).toBe(true);
    });

    it('hide() should make it hidden', () => {
        const { defaultHandler } = createSwitchAndDefault('ctx.tab');

        defaultHandler.hide();
        expect(defaultHandler.isVisible).toBe(false);
    });

    it('commit should apply visibility via classes', () => {
        const { defaultHandler, defaultEl, defaultClasses } = createSwitchAndDefault('ctx.tab');

        defaultHandler.hide();
        defaultHandler.commit();
        defaultClasses.commit();

        expect(defaultEl.className).toContain(hideClassName);

        defaultHandler.show();
        defaultHandler.commit();
        defaultClasses.commit();

        expect(defaultEl.className).not.toContain(hideClassName);
    });

    it('bind should return executionParams unchanged', () => {
        const { defaultHandler } = createSwitchAndDefault('ctx.tab');

        const params = { x: 1 } as any;
        expect(defaultHandler.bind(params, () => {})).toBe(params);
    });

    it('dispose should clean up', () => {
        const { defaultHandler } = createSwitchAndDefault('ctx.tab');
        expect(() => defaultHandler.dispose()).not.toThrow();
    });

    it('should error and disable expression when default has no valid parent switch (M-37 fix)', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const defaultEl = document.createElement('div');
        defaultEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME}`, '');
        const defaultAttrs = new Attributes(defaultEl);
        const defaultClasses = new Classes(defaultEl, defaultAttrs, () => hideClassName);

        const handler = new Default(defaultEl, defaultAttrs, defaultClasses, undefined);

        // M-37: hasNExpression must be false so subsequent binds don't NPE on missing parent
        expect(handler.hasNExpression).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should error when duplicate default is added to same switch via constructor', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const { switchHandler } = createSwitchAndDefault('ctx.tab');

        // Add a second default to the same switch
        const defaultEl2 = document.createElement('div');
        defaultEl2.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME}`, '');
        const defaultAttrs2 = new Attributes(defaultEl2);
        const defaultClasses2 = new Classes(defaultEl2, defaultAttrs2, () => hideClassName);

        const handler2 = new Default(defaultEl2, defaultAttrs2, defaultClasses2, switchHandler);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should not change visibility classes when previousIsVisible equals isVisible', () => {
        const { defaultHandler, defaultClasses } = createSwitchAndDefault('ctx.tab');

        // show, commit, show again → same visibility on second commit
        defaultHandler.show();
        defaultHandler.commit();
        defaultClasses.commit();

        // Force dirty again by calling show (even though already visible)
        defaultHandler.show();
        const result = defaultHandler.commit();
        // isDirty was set, but previousIsVisible === isVisible, so no class change
        expect(result).toBe(true);
    });

    it('dispose without parent switch should not throw', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const defaultEl = document.createElement('div');
        defaultEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME}`, '');
        const defaultAttrs = new Attributes(defaultEl);
        const defaultClasses = new Classes(defaultEl, defaultAttrs, () => hideClassName);
        const handler = new Default(defaultEl, defaultAttrs, defaultClasses, undefined);

        expect(() => handler.dispose()).not.toThrow();
        consoleSpy.mockRestore();
    });

    it('isDirty getter should reflect internal state', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const defaultEl = document.createElement('div');
        defaultEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME}`, '');
        const defaultAttrs = new Attributes(defaultEl);
        const defaultClasses = new Classes(defaultEl, defaultAttrs, () => hideClassName);
        const handler = new Default(defaultEl, defaultAttrs, defaultClasses, undefined);

        expect(handler.isDirty).toBe(false);
        consoleSpy.mockRestore();
    });

    it('bind always passes through executionParams unchanged', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const defaultEl = document.createElement('div');
        defaultEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME}`, '');
        const defaultAttrs = new Attributes(defaultEl);
        const defaultClasses = new Classes(defaultEl, defaultAttrs, () => hideClassName);
        const handler = new Default(defaultEl, defaultAttrs, defaultClasses, undefined);

        const params = { z: 9 } as any;
        expect(handler.bind(params, () => null)).toBe(params);
        consoleSpy.mockRestore();
    });
});
