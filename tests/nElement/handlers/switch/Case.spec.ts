import { Case } from '../../../../src/nElement/handlers/switch/Case';
import { Switch } from '../../../../src/nElement/handlers/switch/Switch';
import { Attributes } from '../../../../src/nElement/handlers/Attributes';
import { Classes } from '../../../../src/nElement/handlers/Classes';
import { Constants } from '../../../../src/Constants';

describe('Case handler', () => {
    const hideClassName = 'nb-hidden';

    function createSwitchAndCase(switchExpr: string, caseExpr: string): { 
        switchEl: Element; switchHandler: Switch;
        caseEl: Element; caseHandler: Case;
        caseClasses: Classes;
    } {
        const switchEl = document.createElement('div');
        switchEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_HANDLER_ATTRIBUTE_NAME}`, switchExpr);
        const switchAttrs = new Attributes(switchEl);
        const switchClasses = new Classes(switchEl, switchAttrs, () => hideClassName);
        const switchHandler = new Switch(switchAttrs, switchClasses);

        const caseEl = document.createElement('div');
        caseEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME}`, caseExpr);
        const caseAttrs = new Attributes(caseEl);
        const caseClasses = new Classes(caseEl, caseAttrs, () => hideClassName);
        const caseHandler = new Case(caseEl, caseAttrs, caseClasses, switchHandler);

        return { switchEl, switchHandler, caseEl, caseHandler, caseClasses };
    }

    it('should detect expression from attribute', () => {
        const { caseHandler } = createSwitchAndCase('ctx.tab', 'home');
        expect(caseHandler.hasNExpression).toBe(true);
    });

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const classes = new Classes(el, attrs, () => hideClassName);
        const handler = new Case(el, attrs, classes, undefined);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should be visible by default', () => {
        const { caseHandler } = createSwitchAndCase('ctx.tab', 'home');
        expect(caseHandler.isVisible).toBe(true);
    });

    it('should be visible when switch value matches case name', () => {
        const { switchHandler, caseHandler } = createSwitchAndCase('ctx.tab', 'home');

        switchHandler.bind(undefined, () => 'home');
        caseHandler.bind(undefined, () => 'home');

        expect(caseHandler.isVisible).toBe(true);
    });

    it('should not be visible when switch value does not match', () => {
        const { switchHandler, caseHandler } = createSwitchAndCase('ctx.tab', 'settings');

        switchHandler.bind(undefined, () => 'home');
        caseHandler.bind(undefined, () => 'settings');

        expect(caseHandler.isVisible).toBe(false);
    });

    it('should hide element via classes on commit', () => {
        const { switchHandler, caseHandler, caseEl, caseClasses } = createSwitchAndCase('ctx.tab', 'settings');

        switchHandler.bind(undefined, () => 'home');
        caseHandler.bind(undefined, () => 'settings');
        caseHandler.commit();
        caseClasses.commit();

        expect(caseEl.className).toContain(hideClassName);
    });

    it('should show element when switch value matches', () => {
        const { switchHandler, caseHandler, caseEl, caseClasses } = createSwitchAndCase('ctx.tab', 'home');

        switchHandler.bind(undefined, () => 'home');
        caseHandler.bind(undefined, () => 'home');
        caseHandler.commit();
        caseClasses.commit();

        expect(caseEl.className).not.toContain(hideClassName);
    });

    it('dispose should clean up', () => {
        const { caseHandler } = createSwitchAndCase('ctx.tab', 'home');
        expect(() => caseHandler.dispose()).not.toThrow();
    });

    it('should error and disable expression when case has no valid parent switch (M-37 fix)', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const caseEl = document.createElement('div');
        caseEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME}`, 'home');
        const caseAttrs = new Attributes(caseEl);
        const caseClasses = new Classes(caseEl, caseAttrs, () => hideClassName);

        // Pass undefined as controllingSwitch
        const caseHandler = new Case(caseEl, caseAttrs, caseClasses, undefined);

        // M-37: hasNExpression must be false so subsequent binds don't NPE on missing parent
        expect(caseHandler.hasNExpression).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should not change visibility classes when previousIsVisible equals isVisible', () => {
        const { switchHandler, caseHandler, caseClasses } = createSwitchAndCase('ctx.tab', 'home');

        // First: bind and commit to set caseName = 'home', switch value = 'home' → visible
        switchHandler.bind(undefined, () => 'home');
        caseHandler.bind(undefined, () => 'home');
        caseHandler.commit();
        caseClasses.commit();

        // Now re-bind with same values → visibility stays the same
        caseHandler.bind(undefined, () => 'home');
        const result = caseHandler.commit();

        // isDirty was true (isVisible setter), but previousIsVisible === isVisible
        expect(result).toBe(true); // was dirty
    });

    it('should dispose without error when no removeFromParentSwitch', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const caseEl = document.createElement('div');
        caseEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME}`, 'test');
        const caseAttrs = new Attributes(caseEl);
        const caseClasses = new Classes(caseEl, caseAttrs, () => hideClassName);
        const caseHandler = new Case(caseEl, caseAttrs, caseClasses, undefined);

        // dispose should not throw even without valid parent switch
        expect(() => caseHandler.dispose()).not.toThrow();
        consoleSpy.mockRestore();
    });

    it('isDirty getter should reflect internal state', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const caseEl = document.createElement('div');
        caseEl.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME}`, 'tab1');
        const caseAttrs = new Attributes(caseEl);
        const caseClasses = new Classes(caseEl, caseAttrs, () => hideClassName);
        const caseHandler = new Case(caseEl, caseAttrs, caseClasses, undefined);

        expect(caseHandler.isDirty).toBe(false);
        consoleSpy.mockRestore();
    });
});
