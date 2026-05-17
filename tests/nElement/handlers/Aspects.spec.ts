import { Aspects } from '../../../src/nElement/handlers/Aspects';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Environment } from '../../../src/Environment';
import { Constants } from '../../../src/Constants';
import { Console } from '../../../src/Console';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('Aspects handler', () => {
    const mockGetManipulations = () => ({} as any);
    const mockGetSubscriptions = () => ({} as any);
    const mockGetEventDispatcher = () => ({} as any);
    const mockDetectChanges = jest.fn();

    /** Helper: create an element with an nb-aspect:xxx attribute */
    function createElementWithAspect(aspectKebabName: string, expression: string): Element {
        const el = document.createElement('div');
        el.setAttribute(
            `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}${aspectKebabName}`,
            expression
        );
        return el;
    }

    /** Mock Environment.aspects with controllable behaviour */
    function mockAspectsEnv(opts: {
        has?: boolean;
        instantiateReturn?: [any, boolean] | undefined;
        tryPrepareSync?: boolean;
        getStylesReturn?: [CSSStyleSheet | undefined, string[] | undefined] | undefined;
    } = {}) {
        const mockAspectInstance = { data: undefined } as any;
        const aspects = {
            has: jest.fn().mockReturnValue(opts.has ?? true),
            isReady: jest.fn().mockReturnValue(true),
            instantiate: jest.fn().mockReturnValue(
                opts.instantiateReturn !== undefined
                    ? opts.instantiateReturn
                    : [mockAspectInstance, false]),
            tryPrepare: jest.fn().mockImplementation((_name: string, cb: () => void) => {
                if (opts.tryPrepareSync !== false) { cb(); }
                return true;
            }),
            getStyles: jest.fn().mockReturnValue(opts.getStylesReturn ?? undefined),
        };

        (Environment as any)._aspects = aspects;
        Object.defineProperty(Environment, 'aspects', { get: () => aspects, configurable: true });

        return { aspects, mockAspectInstance };
    }

    /** Mock Environment.adoptedStyles */
    function mockAdoptedStylesEnv(cssSheet?: CSSStyleSheet) {
        const adoptedStyles = {
            tryPrepare: jest.fn().mockImplementation((_name: string, cb: () => void) => { cb(); return true; }),
            get: jest.fn().mockReturnValue(cssSheet),
        };

        (Environment as any)._adoptedStyles = adoptedStyles;
        Object.defineProperty(Environment, 'adoptedStyles', { get: () => adoptedStyles, configurable: true });

        return adoptedStyles;
    }

    /** Clear the private static tracker between tests */
    function clearStyleTracker(): void {
        (Aspects as any)._adoptedCssStyleSheetsTracker.clear();
    }

    beforeEach(() => {
        jest.clearAllMocks();
        clearStyleTracker();
        // Ensure document.adoptedStyleSheets is a mutable array
        document.adoptedStyleSheets = [];
    });

    // ───── existing tests ─────

    it('should have no expression when no aspect attributes', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                    mockGetEventDispatcher, mockDetectChanges);

        expect(handler.hasNExpression).toBe(false);
    });

    it('isDirty should be false initially', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                    mockGetEventDispatcher, mockDetectChanges);

        expect(handler.isDirty).toBe(false);
    });

    it('should return executionParams from bind when no expression', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                    mockGetEventDispatcher, mockDetectChanges);

        const params = { x: 1 } as any;
        // When hasNExpression is false, bind just returns params
        expect(handler.bind(params, () => {})).toBe(params);
    });

    // ───── new: constructor with registered aspect ─────

    describe('constructor with registered aspect', () => {
        it('should create expression details and aspect bindings', () => {
            const { aspects, mockAspectInstance } = mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.value');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            expect(handler.hasNExpression).toBe(true);
            expect(aspects.has).toHaveBeenCalledWith('my-aspect');
            expect(aspects.instantiate).toHaveBeenCalled();
            expect(handler.nExpression!.has('my-aspect')).toBe(true);
            const bindings = handler.nExpression!.get('my-aspect')!;
            expect(bindings.nExpression).toBeDefined();
            expect(bindings.nExpression!.expression).toBe('ctx.value');
            expect(bindings.aspect).toBe(mockAspectInstance);
        });

        it('should handle aspect with no expression value (undefined value)', () => {
            mockAspectsEnv({ has: true });

            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}my-aspect`,
                ''
            );
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            expect(handler.hasNExpression).toBe(true);
            // Binding should exist but nExpression should be undefined
            const bindings = handler.nExpression!.get('my-aspect');
            expect(bindings).toBeDefined();
            expect(bindings!.nExpression).toBeUndefined();
        });

        it('should error when aspect name is empty', () => {
            mockAspectsEnv({ has: true });
            const consoleSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});

            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}`,
                'ctx.x'
            );
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            expect(consoleSpy).toHaveBeenCalledWith(el, expect.stringContaining("can't be empty"));
            consoleSpy.mockRestore();
        });

        it('should error when instantiate returns undefined', () => {
            const aspects = {
                has: jest.fn().mockReturnValue(true),
                isReady: jest.fn().mockReturnValue(true),
                instantiate: jest.fn().mockReturnValue(undefined),
                tryPrepare: jest.fn(),
                getStyles: jest.fn(),
            };
            (Environment as any)._aspects = aspects;
            Object.defineProperty(Environment, 'aspects', { get: () => aspects, configurable: true });
            
            const consoleSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});

            const el = createElementWithAspect('broken-aspect', 'ctx.x');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            expect(consoleSpy).toHaveBeenCalledWith(el, expect.stringContaining('cannot be constructed'));
            consoleSpy.mockRestore();
        });
    });

    // ───── new: bind evaluates expression ─────

    describe('bind()', () => {
        it('should evaluate the aspect expression and set data on aspect bindings', () => {
            const { aspects, mockAspectInstance } = mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.value');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            const params = {} as any;
            const executeExpression = jest.fn().mockReturnValue(42);

            handler.bind(params, executeExpression);

            expect(executeExpression).toHaveBeenCalledWith('ctx.value', params);
            expect(handler.isDirty).toBe(true);

            // The data should be staged on the bindings
            const bindings = handler.nExpression!.get('my-aspect')!;
            expect(bindings.data).toBe(42);
        });

        it('should skip expression evaluation for aspects without nExpression', () => {
            mockAspectsEnv({ has: true });

            // Create aspect with empty expression value
            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}my-aspect`,
                ''
            );
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            const executeExpression = jest.fn();
            handler.bind({} as any, executeExpression);

            // executeExpression should NOT be called because nExpression on the binding is undefined
            expect(executeExpression).not.toHaveBeenCalled();
        });

        it('commit should transfer staged data to aspect.data', () => {
            const { aspects, mockAspectInstance } = mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.value');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            handler.bind({} as any, jest.fn().mockReturnValue('hello'));
            expect(handler.commit()).toBe(true);
            expect(mockAspectInstance.data).toBe('hello');
            expect(handler.isDirty).toBe(false);
        });

        it('commit should return false when not dirty', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            expect(handler.commit()).toBe(false);
        });
    });

    // ───── new: unknown aspect name ─────

    describe('constructor with unknown aspect', () => {
        it('should log error when aspect name is not registered', () => {
            mockAspectsEnv({ has: false });
            const consoleSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});

            const el = createElementWithAspect('unknown', 'ctx.x');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            expect(handler.hasNExpression).toBe(true);
            // The map should be empty — nothing was added
            expect(handler.nExpression!.size).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith(el, expect.stringContaining('not found'));

            consoleSpy.mockRestore();
        });
    });

    // ───── new: dispose ─────

    describe('dispose()', () => {
        it('should be safe to call when there are no styles', () => {
            mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.x');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            // No styles → dispose should not throw
            expect(() => handler.dispose()).not.toThrow();
        });

        it('should remove adopted stylesheet from root when last usage is disposed', () => {
            const cssSheet = new CSSStyleSheet();
            mockAspectsEnv({
                has: true,
                instantiateReturn: [{ data: undefined }, true],
                tryPrepareSync: true,
                getStylesReturn: [cssSheet, undefined],
            });

            const el = createElementWithAspect('styled', 'ctx.x');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            // The stylesheet should have been pushed to the document
            expect(document.adoptedStyleSheets).toContain(cssSheet);

            handler.dispose();

            // After dispose, the stylesheet should be removed
            expect(document.adoptedStyleSheets).not.toContain(cssSheet);
        });

        it('should decrement usage count but keep stylesheet when other instances remain', () => {
            const cssSheet = new CSSStyleSheet();
            const envOpts = {
                has: true,
                instantiateReturn: [{ data: undefined }, true] as [any, boolean],
                tryPrepareSync: true,
                getStylesReturn: [cssSheet, undefined] as [CSSStyleSheet | undefined, string[] | undefined],
            };
            mockAspectsEnv(envOpts);

            const el1 = createElementWithAspect('styled', 'ctx.a');
            const handler1 = new Aspects(el1, new Attributes(el1), mockGetManipulations, mockGetSubscriptions,
                                         mockGetEventDispatcher, mockDetectChanges);

            // Re-mock so instantiate returns a fresh aspect for the second handler
            mockAspectsEnv(envOpts);

            const el2 = createElementWithAspect('styled', 'ctx.b');
            const handler2 = new Aspects(el2, new Attributes(el2), mockGetManipulations, mockGetSubscriptions,
                                         mockGetEventDispatcher, mockDetectChanges);

            expect(document.adoptedStyleSheets.filter(s => s === cssSheet).length).toBeGreaterThanOrEqual(1);

            // Dispose only one handler — stylesheet should remain
            handler1.dispose();
            expect(document.adoptedStyleSheets).toContain(cssSheet);

            // Dispose the second — now it should be removed
            handler2.dispose();
            expect(document.adoptedStyleSheets).not.toContain(cssSheet);
        });
    });

    // ───── new: aspect with adopted styles (external stylesheet names) ─────

    describe('aspect with adopted styles', () => {
        it('should add adopted stylesheets from adoptedStyleNames', () => {
            const ownCssSheet = new CSSStyleSheet();
            const adoptedCssSheet = new CSSStyleSheet();

            mockAspectsEnv({
                has: true,
                instantiateReturn: [{ data: undefined }, true],
                tryPrepareSync: true,
                getStylesReturn: [ownCssSheet, ['shared-styles']],
            });
            mockAdoptedStylesEnv(adoptedCssSheet);

            const el = createElementWithAspect('fancy', 'ctx.y');
            const attrs = new Attributes(el);
            const handler = new Aspects(el, attrs, mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher, mockDetectChanges);

            expect(document.adoptedStyleSheets).toContain(ownCssSheet);
            expect(document.adoptedStyleSheets).toContain(adoptedCssSheet);

            handler.dispose();

            expect(document.adoptedStyleSheets).not.toContain(ownCssSheet);
            expect(document.adoptedStyleSheets).not.toContain(adoptedCssSheet);
        });
    });
});
