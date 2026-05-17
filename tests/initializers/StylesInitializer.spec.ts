import { StylesInitializer } from '../../src/initializers/StylesInitializer';
import { Environment } from '../../src/Environment';
import { Helpers } from '../../src/Helpers';

// Polyfill CSSStyleSheet for jsdom
if (typeof CSSStyleSheet !== 'undefined' && !CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function (_text: string) {};
}

describe('StylesInitializer', () => {
    beforeEach(() => {
        // Reset adoptedStyleSheets
        document.adoptedStyleSheets = [];
        // Reset the _initTimeout static field
        (StylesInitializer as any)._initTimeout = undefined;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should add processing hide stylesheet to document', () => {
        StylesInitializer.init();
        expect(document.adoptedStyleSheets).toContain(
            Environment.adoptedStyles.processingHideCSSStyleSheet
        );
    });

    it('should add hide stylesheet to document', () => {
        StylesInitializer.init();
        expect(document.adoptedStyleSheets).toContain(
            Environment.adoptedStyles.hideCSSStyleSheet
        );
    });

    it('should add exactly 2 stylesheets', () => {
        StylesInitializer.init();
        expect(document.adoptedStyleSheets.length).toBe(2);
    });

    it('should preserve pre-existing adoptedStyleSheets and append framework sheets (M-38 fix)', () => {
        // M-38 removed the `Array.isArray` guard that always overwrote adoptedStyleSheets.
        // Pre-existing sheets adopted by other libraries must NOT be wiped.
        const externalSheet = new CSSStyleSheet();
        externalSheet.replaceSync('.external { color: green; }');
        document.adoptedStyleSheets = [externalSheet];

        StylesInitializer.init();

        expect(document.adoptedStyleSheets).toContain(externalSheet);
        expect(document.adoptedStyleSheets).toContain(Environment.adoptedStyles.processingHideCSSStyleSheet);
        expect(document.adoptedStyleSheets).toContain(Environment.adoptedStyles.hideCSSStyleSheet);
        expect(document.adoptedStyleSheets.length).toBe(3);
    });

    it('should clear previous timeout when calling init again', () => {
        const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
        
        // Set a fake _initTimeout 
        (StylesInitializer as any)._initTimeout = 12345;
        
        StylesInitializer.init();
        
        expect(clearTimeoutSpy).toHaveBeenCalledWith(12345);
    });

    it('should not clear timeout when _initTimeout is not a number', () => {
        const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

        // Make sure _initTimeout is undefined (not a number)
        (StylesInitializer as any)._initTimeout = undefined;

        StylesInitializer.init();

        // clearTimeout should not be called when no timeout is pending
        expect(clearTimeoutSpy).not.toHaveBeenCalled();
    });

    it('should schedule a retry via setTimeout when document is undefined', () => {
        // Helpers.isUndefined(document) is the gate; mock it to return true to take the else branch.
        const isUndefinedSpy = jest.spyOn(Helpers, 'isUndefined').mockReturnValue(true);
        const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout').mockImplementation((() => 4242) as any);

        try {
            (StylesInitializer as any)._initTimeout = undefined;
            StylesInitializer.init();
            expect(setTimeoutSpy).toHaveBeenCalled();
            expect((StylesInitializer as any)._initTimeout).toBe(4242);
        } finally {
            isUndefinedSpy.mockRestore();
            setTimeoutSpy.mockRestore();
            (StylesInitializer as any)._initTimeout = undefined;
        }
    });
});
