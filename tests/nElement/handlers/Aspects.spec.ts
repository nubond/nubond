import { Aspects } from '../../../src/nElement/handlers/Aspects';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Environment } from '../../../src/Environment';
import { Constants } from '../../../src/Constants';
import { Console } from '../../../src/Console';
import { ElementManipulations } from '../../../src/models/injections/ElementManipulations';
import { ElementSubscriptions } from '../../../src/models/injections/ElementSubscriptions';
import { ChangeDetector } from '../../../src/models/injections/ChangeDetector';
import { IContextBinder } from '../../../src/interfaces/contextBinders/IContextBinder';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

// the handler now calls contextBinder.detectChanges() itself (it used to get a requestDetectChanges closure)
const binderWith = (detectChanges: () => void): IContextBinder => <IContextBinder><unknown>{ detectChanges };

describe('Aspects handler', () => {
    const mockGetManipulations = () => ({} as any);
    const mockGetSubscriptions = () => ({} as any);
    const mockGetEventDispatcher = () => ({} as any);
    const mockDetectChanges = jest.fn();

    /** Helper: build the handler — aspects are instantiated in the constructor (the separate construct() step of L-33 was folded in) */
    function constructAspects(...args: ConstructorParameters<typeof Aspects>): Aspects {
        return new Aspects(...args);
    }

    /** Helper: create an element with an nb-aspect:xxx attribute */
    function createElementWithAspect(aspectKebabName: string, expression: string): Element {
        const el = document.createElement('div');
        el.setAttribute(
            `${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}${aspectKebabName}`,
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
        /** aspect name → its registered DI dependencies (missing name → undefined) */
        dependencies?: Record<string, ReadonlySet<unknown>>;
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
            getDependencies: jest.fn().mockImplementation((name: string) => opts.dependencies?.[name]),
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
        const attrs = new Attributes(el, false);
        const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                         mockGetEventDispatcher);

        expect(handler.hasNExpression).toBe(false);
    });

    it('isDirty should be false initially', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, false);
        const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                         mockGetEventDispatcher);

        expect(handler.isDirty).toBe(false);
    });

    it('should return executionParams from bind when no expression', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el, false);
        const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                         mockGetEventDispatcher);

        const params = { x: 1 } as any;
        // When hasNExpression is false, bind just returns params
        expect(handler.bind(params, () => {})).toBe(params);
    });

    // ───── new: constructor with registered aspect ─────

    describe('constructor with registered aspect', () => {
        it('should create expression details and aspect bindings', () => {
            const { aspects, mockAspectInstance } = mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.value');
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

            expect(handler.hasNExpression).toBe(true);
            expect(aspects.has).toHaveBeenCalledWith('my-aspect');
            expect(aspects.instantiate).toHaveBeenCalled();
            expect(handler.nExpression!.has('my-aspect')).toBe(true);
            const bindings = handler.nExpression!.get('my-aspect')!;
            expect(bindings.nExpression).toBeDefined();
            expect(bindings.nExpression!.expression).toBe('ctx.value');
            expect(bindings.aspect).toBe(mockAspectInstance);
        });

        it('should instantiate the aspects in the constructor — there is no separate construct() step', () => {
            const { aspects } = mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.value');
            const handler = new Aspects(el, new Attributes(el, false), binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher);

            expect(handler.hasNExpression).toBe(true);
            expect(aspects.instantiate).toHaveBeenCalledTimes(1);
            expect(handler.nExpression!.has('my-aspect')).toBe(true);
            expect((handler as any).construct).toBeUndefined();
        });

        it('should construct every aspect when an earlier one has an already-loaded style', () => {
            // regression: a ready style calls back synchronously from tryPrepare; the first
            // cut of construct() released its captured dependencies there, mid-loop, and the
            // next aspect threw "this._getElementManipulations is not a function"
            const sheetA = new CSSStyleSheet();
            const sheetB = new CSSStyleSheet();
            const { aspects } = mockAspectsEnv({ has: true, tryPrepareSync: true });
            aspects.instantiate.mockImplementation(() => [{ data: undefined }, true]);
            aspects.getStyles.mockImplementation((name: string) => [name === 'styled-a' ? sheetA : sheetB, undefined]);

            const manipulations = jest.fn(() => ({} as any));
            const el = createElementWithAspect('styled-a', '');
            el.setAttribute(`${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}styled-b`, '');
            document.body.appendChild(el);

            let handler: Aspects | undefined;
            expect(() => {
                handler = constructAspects(el, new Attributes(el, false), binderWith(mockDetectChanges), manipulations, mockGetSubscriptions,
                                           mockGetEventDispatcher);
            }).not.toThrow();

            expect(aspects.instantiate).toHaveBeenCalledTimes(2);
            expect(manipulations).toHaveBeenCalledTimes(2);
            expect([...handler!.nExpression!.keys()]).toEqual(['styled-a', 'styled-b']);
            expect(document.adoptedStyleSheets).toEqual([sheetA, sheetB]);

            handler!.dispose();
            el.remove();
            expect(document.adoptedStyleSheets).toEqual([]);
        });

        it('should handle aspect with no expression value (undefined value)', () => {
            mockAspectsEnv({ has: true });

            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}my-aspect`,
                ''
            );
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

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
                `${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}`,
                'ctx.x'
            );
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

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
                getDependencies: jest.fn().mockReturnValue(undefined),
            };
            (Environment as any)._aspects = aspects;
            Object.defineProperty(Environment, 'aspects', { get: () => aspects, configurable: true });
            
            const consoleSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});

            const el = createElementWithAspect('broken-aspect', 'ctx.x');
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

            expect(consoleSpy).toHaveBeenCalledWith(el, expect.stringContaining('cannot be constructed'));
            consoleSpy.mockRestore();
        });
    });

    // ───── new: bind evaluates expression ─────

    // NElement keeps Classes / Styles / Attributes / Properties in its commit sequence only when the
    // manipulation proxy is reachable; for aspects that is decided from the aspects' DI dependencies.
    describe('element manipulations / subscriptions dependencies', () => {
        const aspectAttribute = (name: string) =>
            `${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}${name}`;

        function createWithAspects(...names: Array<string>): Aspects {
            const el = document.createElement('div');
            names.forEach(name => el.setAttribute(aspectAttribute(name), ''));
            return new Aspects(el, new Attributes(el, false), binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                               mockGetEventDispatcher);
        }

        it('should report neither without nb-aspect', () => {
            const { aspects } = mockAspectsEnv({ has: true });
            const handler = createWithAspects();

            expect(handler.hasElementManipulations).toBe(false);
            expect(handler.hasElementSubscriptions).toBe(false);
            expect(aspects.getDependencies).not.toHaveBeenCalled();
        });

        it('should report neither when the aspect dependencies are unknown', () => {
            const { aspects } = mockAspectsEnv({ has: true, dependencies: {} });
            const handler = createWithAspects('my-aspect');

            expect(aspects.getDependencies).toHaveBeenCalledWith('my-aspect');
            expect(handler.hasElementManipulations).toBe(false);
            expect(handler.hasElementSubscriptions).toBe(false);
        });

        it('should report neither when the aspect injects other services only', () => {
            mockAspectsEnv({ has: true, dependencies: { 'my-aspect': new Set([ChangeDetector]) } });
            const handler = createWithAspects('my-aspect');

            expect(handler.hasElementManipulations).toBe(false);
            expect(handler.hasElementSubscriptions).toBe(false);
        });

        it.each([
            ['ElementManipulations only', [ElementManipulations], true, false],
            ['ElementSubscriptions only', [ElementSubscriptions], false, true],
            ['both', [ElementManipulations, ElementSubscriptions], true, true],
        ])('should report the injected proxies (%s)', (_label, dependencies, manipulations, subscriptions) => {
            mockAspectsEnv({ has: true, dependencies: { 'my-aspect': new Set(dependencies) } });
            const handler = createWithAspects('my-aspect');

            expect(handler.hasElementManipulations).toBe(manipulations);
            expect(handler.hasElementSubscriptions).toBe(subscriptions);
        });

        it('should combine the dependencies of every aspect on the element', () => {
            mockAspectsEnv({ has: true, dependencies: {
                'manipulating': new Set([ElementManipulations]),
                'plain': new Set([ChangeDetector]),
                'subscribing': new Set([ElementSubscriptions])
            } });
            const handler = createWithAspects('manipulating', 'plain', 'subscribing');

            expect(handler.nExpression!.size).toBe(3);
            expect(handler.hasElementManipulations).toBe(true);
            expect(handler.hasElementSubscriptions).toBe(true);
        });

        it('should stop looking up dependencies once both proxies are known to be needed', () => {
            const { aspects } = mockAspectsEnv({ has: true, dependencies: {
                'both': new Set([ElementManipulations, ElementSubscriptions]),
                'other': new Set([ChangeDetector])
            } });
            const handler = createWithAspects('both', 'other');

            expect(handler.nExpression!.size).toBe(2);
            expect(aspects.getDependencies).toHaveBeenCalledTimes(1);
            expect(aspects.getDependencies).toHaveBeenCalledWith('both');
        });

        it('should ignore unregistered aspects', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const { aspects } = mockAspectsEnv({ has: false, dependencies: { 'missing': new Set([ElementManipulations]) } });
            const handler = createWithAspects('missing');

            expect(aspects.getDependencies).not.toHaveBeenCalled();
            expect(handler.hasElementManipulations).toBe(false);
            expect(handler.hasElementSubscriptions).toBe(false);
            errorSpy.mockRestore();
        });
    });

    describe('bind()', () => {
        it('should evaluate the aspect expression and set data on aspect bindings', () => {
            const { aspects, mockAspectInstance } = mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.value');
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

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
                `${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}my-aspect`,
                ''
            );
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

            const executeExpression = jest.fn();
            handler.bind({} as any, executeExpression);

            // executeExpression should NOT be called because nExpression on the binding is undefined
            expect(executeExpression).not.toHaveBeenCalled();
        });

        it('commit should transfer staged data to aspect.data', () => {
            const { aspects, mockAspectInstance } = mockAspectsEnv({ has: true });

            const el = createElementWithAspect('my-aspect', 'ctx.value');
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

            handler.bind({} as any, jest.fn().mockReturnValue('hello'));
            expect(handler.commit()).toBe(true);
            expect(mockAspectInstance.data).toBe('hello');
            expect(handler.isDirty).toBe(false);
        });

        it('commit should return false when not dirty', () => {
            const el = document.createElement('div');
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

            expect(handler.commit()).toBe(false);
        });
    });

    // ───── new: unknown aspect name ─────

    describe('constructor with unknown aspect', () => {
        it('should log error when aspect name is not registered', () => {
            mockAspectsEnv({ has: false });
            const consoleSpy = jest.spyOn(Console, 'error').mockImplementation(() => {});

            const el = createElementWithAspect('unknown', 'ctx.x');
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

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
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

            // No styles → dispose should not throw
            expect(() => handler.dispose()).not.toThrow();
        });

        // L-45: aspects had no dispose lifecycle, so timers/listeners acquired in the constructor leaked.
        describe('L-45: aspect context onDispose', () => {
            function createElementWithAspects(names: Array<string>): Element {
                const el = document.createElement('div');
                for (const name of names) {
                    el.setAttribute(`${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}` +
                                    `${Constants.META_VALUE_SEPARATOR}${name}`, '');
                }
                return el;
            }

            function createHandler(instances: {[name: string]: any}): Aspects {
                const { aspects } = mockAspectsEnv({ has: true });
                aspects.instantiate.mockImplementation((name: string) => [instances[name], false]);

                const el = createElementWithAspects(Object.keys(instances));
                return constructAspects(el, new Attributes(el, false), binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher);
            }

            it('should call the aspect context onDispose on dispose', () => {
                const instance = { data: undefined, onDispose: jest.fn() };
                const handler = createHandler({ 'my-aspect': instance });

                expect(instance.onDispose).not.toHaveBeenCalled();
                handler.dispose();
                expect(instance.onDispose).toHaveBeenCalledTimes(1);
            });

            it('should be optional - an aspect without onDispose disposes cleanly', () => {
                const handler = createHandler({ 'my-aspect': { data: undefined } });

                expect(() => handler.dispose()).not.toThrow();
            });

            it('should call every aspect onDispose even when an earlier one throws, then throw one aggregated error', () => {
                const first = { data: undefined, onDispose: jest.fn(() => { throw new Error('boom-a'); }) };
                const second = { data: undefined, onDispose: jest.fn() };
                const handler = createHandler({ 'aspect-a': first, 'aspect-b': second });

                expect(() => handler.dispose()).toThrow(/one or more aspect context dispose failed: aspect aspect-a context dispose failed with exception: Error: boom-a/);
                expect(first.onDispose).toHaveBeenCalledTimes(1);
                expect(second.onDispose).toHaveBeenCalledTimes(1);
            });

            it('should release adopted styles before calling onDispose, even when onDispose throws', () => {
                const cssSheet = new CSSStyleSheet();
                const instance = {
                    data: undefined,
                    onDispose: jest.fn(() => {
                        expect(document.adoptedStyleSheets).not.toContain(cssSheet);
                        throw new Error('boom');
                    })
                };
                // styles are attached in the tryPrepare callback, which the mock runs synchronously
                const handler = createHandlerWithStyles(instance, cssSheet);
                expect(document.adoptedStyleSheets).toContain(cssSheet);

                expect(() => handler.dispose()).toThrow(/boom/);
                expect(instance.onDispose).toHaveBeenCalledTimes(1);
                expect(document.adoptedStyleSheets).not.toContain(cssSheet);
            });

            function createHandlerWithStyles(instance: any, cssSheet: CSSStyleSheet): Aspects {
                const { aspects } = mockAspectsEnv({ has: true, getStylesReturn: [cssSheet, undefined] });
                aspects.instantiate.mockImplementation(() => [instance, true]);

                const el = createElementWithAspects(['styled-aspect']);
                return constructAspects(el, new Attributes(el, false), binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                        mockGetEventDispatcher);
            }
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
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

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
            const handler1 = constructAspects(el1, new Attributes(el1, false), binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                              mockGetEventDispatcher);

            // Re-mock so instantiate returns a fresh aspect for the second handler
            mockAspectsEnv(envOpts);

            const el2 = createElementWithAspect('styled', 'ctx.b');
            const handler2 = constructAspects(el2, new Attributes(el2, false), binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                              mockGetEventDispatcher);

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
            const attrs = new Attributes(el, false);
            const handler = constructAspects(el, attrs, binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                             mockGetEventDispatcher);

            expect(document.adoptedStyleSheets).toContain(ownCssSheet);
            expect(document.adoptedStyleSheets).toContain(adoptedCssSheet);

            handler.dispose();

            expect(document.adoptedStyleSheets).not.toContain(ownCssSheet);
            expect(document.adoptedStyleSheets).not.toContain(adoptedCssSheet);
        });
    });

    // ───── R3-5: declared-order adoption with more than one adopted style ─────

    describe('R3-5: adopted stylesheets are adopted in declared order', () => {
        /**
         * Per-name sheets, so more than one adopted style can be told apart. Names listed in
         * `deferred` only complete when the returned `flush` is called, which is how the
         * out-of-order case is driven; names listed in `missing` make tryPrepare return false
         * without ever calling back, the way an unregistered adopted-style name does. The
         * module-level mockAdoptedStylesEnv returns one sheet for every name and always calls
         * back synchronously, which cannot express any of these.
         */
        function mockPerNameAdoptedStyles(sheets: Map<string, CSSStyleSheet>,
                                          deferred: Array<string> = [],
                                          missing: Array<string> = []) {
            const pending: Array<() => void> = [];
            const adoptedStyles = {
                tryPrepare: jest.fn().mockImplementation((name: string, cb: (asyncCallBack: boolean) => void) => {
                    if (missing.indexOf(name) >= 0) {
                        return false;
                    }

                    if (deferred.indexOf(name) >= 0) {
                        pending.push(() => cb(true));
                    } else {
                        cb(false);
                    }
                    return true;
                }),
                get: jest.fn().mockImplementation((name: string) => sheets.get(name)),
            };

            (Environment as any)._adoptedStyles = adoptedStyles;
            Object.defineProperty(Environment, 'adoptedStyles', { get: () => adoptedStyles, configurable: true });

            return { flush: () => { const queued = [...pending]; pending.length = 0; queued.forEach(el => el()); } };
        }

        function buildHandler(): Aspects {
            const el = createElementWithAspect('fancy', 'ctx.y');
            return constructAspects(el, new Attributes(el, false), binderWith(mockDetectChanges), mockGetManipulations, mockGetSubscriptions,
                                    mockGetEventDispatcher);
        }

        it('should adopt every declared stylesheet, not only one of them', () => {
            const sheetA = new CSSStyleSheet();
            const sheetB = new CSSStyleSheet();

            mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['a', 'b']] });
            mockPerNameAdoptedStyles(new Map([['a', sheetA], ['b', sheetB]]));

            const handler = buildHandler();

            expect(document.adoptedStyleSheets).toContain(sheetA);
            expect(document.adoptedStyleSheets).toContain(sheetB);
            expect(document.adoptedStyleSheets.indexOf(sheetA)).toBeLessThan(document.adoptedStyleSheets.indexOf(sheetB));

            handler.dispose();

            expect(document.adoptedStyleSheets).not.toContain(sheetA);
            expect(document.adoptedStyleSheets).not.toContain(sheetB);
        });

        it('should keep declared order when the first declared style completes last', () => {
            const sheetA = new CSSStyleSheet();
            const sheetB = new CSSStyleSheet();

            mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['a', 'b']] });
            //'a' is declared first but resolves after 'b' — completion order must not decide cascade order
            const { flush } = mockPerNameAdoptedStyles(new Map([['a', sheetA], ['b', sheetB]]), ['a']);

            buildHandler();
            flush();

            expect(document.adoptedStyleSheets.indexOf(sheetA)).toBeLessThan(document.adoptedStyleSheets.indexOf(sheetB));
        });

        it('should adopt the aspect own style before the adopted ones', () => {
            const ownSheet = new CSSStyleSheet();
            const sheetA = new CSSStyleSheet();

            mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [ownSheet, ['a']] });
            mockPerNameAdoptedStyles(new Map([['a', sheetA]]));

            buildHandler();

            expect(document.adoptedStyleSheets.indexOf(ownSheet)).toBeLessThan(document.adoptedStyleSheets.indexOf(sheetA));
        });

        it('should still adopt a ready style declared before an unregistered one', () => {
            // tryPrepare returns false for an unregistered name and never calls back, so the
            // completion gate has to be re-evaluated from that fallback too - otherwise the
            // sheets already collected are never pushed.
            const sheetA = new CSSStyleSheet();

            mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['a', 'missing']] });
            mockPerNameAdoptedStyles(new Map([['a', sheetA]]), [], ['missing']);

            const handler = buildHandler();

            expect(document.adoptedStyleSheets).toContain(sheetA);
            // adopted and refcounted exactly once - the gate must not run twice
            expect((handler as any)._adoptedCssStyleSheet.filter((el: any) => el === sheetA).length).toBe(1);

            handler.dispose();

            expect(document.adoptedStyleSheets).not.toContain(sheetA);
        });

        it('should adopt an async style declared before an unregistered one once it lands', () => {
            const sheetA = new CSSStyleSheet();

            mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['a', 'missing']] });
            const { flush } = mockPerNameAdoptedStyles(new Map([['a', sheetA]]), ['a'], ['missing']);

            const handler = buildHandler();
            expect(document.adoptedStyleSheets).not.toContain(sheetA);

            flush();

            expect(document.adoptedStyleSheets).toContain(sheetA);
            expect((handler as any)._adoptedCssStyleSheet.filter((el: any) => el === sheetA).length).toBe(1);
        });

        // L-40: an unregistered (or never-fetchable) adopted-style name used to be skipped without a word
        describe('L-40: unknown adopted-style names are reported', () => {
            let consoleSpy: jest.SpyInstance;
            beforeEach(() => { consoleSpy = jest.spyOn(Console, 'error').mockImplementation(() => {}); });
            afterEach(() => { consoleSpy.mockRestore(); });

            const adoptedStyleErrors = () => consoleSpy.mock.calls.filter(call => String(call[call.length - 1]).includes('adoptedStyle'));

            it('should log one error naming the missing style and the aspect', () => {
                const sheetA = new CSSStyleSheet();
                mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['a', 'missing']] });
                mockPerNameAdoptedStyles(new Map([['a', sheetA]]), [], ['missing']);

                buildHandler();

                expect(adoptedStyleErrors()).toEqual([
                    [expect.any(HTMLElement), `unable to get missing adoptedStyle for aspect with 'fancy' name.`]
                ]);
                expect(document.adoptedStyleSheets).toContain(sheetA);
            });

            it('should NOT log for registered styles, ready or still loading', () => {
                mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['a', 'b']] });
                const { flush } = mockPerNameAdoptedStyles(new Map([['a', new CSSStyleSheet()], ['b', new CSSStyleSheet()]]), ['b']);

                buildHandler();
                flush();

                expect(adoptedStyleErrors()).toEqual([]);
            });
        });

        it('should adopt nothing and not throw when every name is unregistered', () => {
            mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['m1', 'm2']] });
            mockPerNameAdoptedStyles(new Map(), [], ['m1', 'm2']);

            expect(() => buildHandler()).not.toThrow();
            expect(document.adoptedStyleSheets.length).toBe(0);
        });

        it('should adopt once and still release on dispose when two names resolve to one sheet', () => {
            // Repeated names cannot reach the handler — the aspect metadata dedupes them at
            // registration (see the Aspects entity spec). Case variants can, because that
            // filter is case-sensitive while adopted-style lookup is not, so two declared
            // names resolve to the same sheet. The sheet is adopted once (indexOf guard) but
            // the usage count is incremented once per declared name; dispose decrements once
            // per name too, so the asymmetry is only apparent. Pinned because "fixing" the
            // double count on one side alone would strand the sheet in adoptedStyleSheets.
            const sheet = new CSSStyleSheet();

            mockAspectsEnv({ has: true, instantiateReturn: [{ data: undefined }, true], getStylesReturn: [undefined, ['Shared', 'shared']] });
            mockPerNameAdoptedStyles(new Map([['Shared', sheet], ['shared', sheet]]));

            const handler = buildHandler();

            expect(document.adoptedStyleSheets.filter(el => el === sheet).length).toBe(1);
            expect((handler as any)._adoptedCssStyleSheet.length).toBe(2);

            handler.dispose();

            expect(document.adoptedStyleSheets).not.toContain(sheet);
        });
    });
});
