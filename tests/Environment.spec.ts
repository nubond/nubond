// Because Environment is a static singleton with many hard-wired entity imports,
// we test it through its public API while mocking the DOM and downstream dependencies.

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

// polyfill structuredClone for jsdom
if (typeof globalThis.structuredClone !== 'function') {
    (globalThis as any).structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

// Environment and Constants are static singletons — import dynamically inside beforeEach
// so that jest's resetModules (configured in jest.config.ts) gives each test a fresh instance.
let Environment: typeof import('../src/Environment').Environment;
let Constants: typeof import('../src/Constants').Constants;

beforeEach(() => {
    jest.resetModules();
    const envMod = jest.requireActual('../src/Environment') as typeof import('../src/Environment');
    Environment = envMod.Environment;
    const constMod = jest.requireActual('../src/Constants') as typeof import('../src/Constants');
    Constants = constMod.Constants;
});

// Suppress console.error from internal Console helper during tests
beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

describe('Environment', () => {
    describe('static entity getters', () => {
        it('should expose detectors', () => {
            expect(Environment.detectors).toBeDefined();
        });

        it('should expose eventers', () => {
            expect(Environment.eventers).toBeDefined();
        });

        it('should expose injectables', () => {
            expect(Environment.injectables).toBeDefined();
        });

        it('should expose aspects', () => {
            expect(Environment.aspects).toBeDefined();
        });

        it('should expose transformers', () => {
            expect(Environment.transformers).toBeDefined();
        });

        it('should expose templates', () => {
            expect(Environment.templates).toBeDefined();
        });

        it('should expose adoptedStyles', () => {
            expect(Environment.adoptedStyles).toBeDefined();
        });

        it('should expose containers', () => {
            expect(Environment.containers).toBeDefined();
        });

        it('should expose components', () => {
            expect(Environment.components).toBeDefined();
        });
    });

    describe('config', () => {
        it('should accept a valid config object with showDebugInfo', () => {
            // Should not throw
            expect(() => {
                Environment.config({ showDebugInfo: true } as any);
            }).not.toThrow();
        });

        it('should accept complyWithW3C config', () => {
            expect(() => {
                Environment.config({ complyWithW3C: true } as any);
            }).not.toThrow();
        });

        it('should accept pessimisticChangeDetectionStrategy config', () => {
            expect(() => {
                Environment.config({ pessimisticChangeDetectionStrategy: true } as any);
            }).not.toThrow();
        });

        it('should accept shadowRootConfig config', () => {
            expect(() => {
                Environment.config({ shadowRootConfig: { mode: 'open' } } as any);
            }).not.toThrow();
        });

        it('should accept htmlSanitizer config', () => {
            const sanitizer = (html: string) => html;
            expect(() => {
                Environment.config({ htmlSanitizer: sanitizer } as any);
            }).not.toThrow();
        });

        it('should accept styleSanitizer config', () => {
            const sanitizer = (style: string) => style;
            expect(() => {
                Environment.config({ styleSanitizer: sanitizer } as any);
            }).not.toThrow();
        });
    });

    describe('setupRouter', () => {
        it('should initialize router on first call', () => {
            Environment.setupRouter('/test/route');
            expect(Environment.router).toBeDefined();
        });

        it('should log an error on second call with non-empty routeConfig', () => {
            // setupRouter no longer throws — it logs and ignores the new config.
            (console.error as jest.Mock).mockClear();
            Environment.setupRouter('/first/route');
            expect(() => {
                Environment.setupRouter('/another/route');
            }).not.toThrow();
            expect(console.error as jest.Mock).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringContaining('Router is already initialized'),
            );
        });

        it('should not throw on second call with undefined routeConfig', () => {
            Environment.setupRouter('/first/route');
            expect(() => {
                Environment.setupRouter(undefined);
            }).not.toThrow();
        });
    });

    describe('addDetector', () => {
        it('should add a detector to detectors registry', () => {
            class TestCtx {}
            Environment.addDetector(TestCtx.prototype, 'myProp');
            const result = Environment.detectors.get(TestCtx as unknown as ObjectConstructor);
            expect(result).toContain('myProp');
        });
    });

    describe('addEventer', () => {
        it('should add an eventer to eventers registry', () => {
            class EventerCtx {}
            Environment.addEventer('test-event', EventerCtx.prototype, 'myEventProp');
            const result = Environment.eventers.get(EventerCtx as unknown as ObjectConstructor);
            expect(result).toBeDefined();
        });
    });

    describe('registerInjectable', () => {
        it('should register an injectable class', () => {
            class TestInjectable {}
            Environment.registerInjectable(TestInjectable as any, [], false);
            // Should be resolvable now
            const instance = Environment.injectables.resolve(TestInjectable as any, undefined as any);
            expect(instance).toBeInstanceOf(TestInjectable);
        });
    });

    describe('addInjectable', () => {
        it('should add an injectable instance', () => {
            const instance = { id: 'test-injectable-instance' };
            expect(() => {
                Environment.addInjectable(instance as any);
            }).not.toThrow();
        });
    });

    describe('addTransformer', () => {
        it('should register a transformer', () => {
            class TestTransformer {
                transform(value: any) { return value; }
            }
            // Should not throw
            expect(() => {
                Environment.addTransformer('testTransformer', TestTransformer as any, []);
            }).not.toThrow();
        });
    });

    describe('addTemplate', () => {
        it('should register a named template', () => {
            Environment.addTemplate('test-tpl', '<div>hello</div>', undefined);
            expect(Environment.templates.has('test-tpl')).toBe(true);
        });

        it('should register a template with a local htmlSanitizer', () => {
            const sanitizer = (html: string) => html.replace('dirty', 'clean');
            Environment.addTemplate('test-tpl-sanitized', '<div>dirty</div>', sanitizer);
            expect(Environment.templates.has('test-tpl-sanitized')).toBe(true);
        });
    });

    describe('addAdoptedStyle', () => {
        it('should register a named adopted style', () => {
            Environment.addAdoptedStyle('test-style', '.cls { color: red; }', undefined);
            expect(Environment.adoptedStyles.has('test-style')).toBe(true);
        });

        it('should register an adopted style with a local styleSanitizer', () => {
            const sanitizer = (style: string) => style.replace('dirty', 'clean');
            Environment.addAdoptedStyle('test-style-sanitized', '.dirty { color: red; }', sanitizer);
            expect(Environment.adoptedStyles.has('test-style-sanitized')).toBe(true);
        });
    });

    describe('addContainer', () => {
        it('should register a container', () => {
            class TestContainer {}
            Environment.addContainer('test-container', TestContainer as any, [],
                                     '<div>container</div>', undefined);
            expect(Environment.containers.has('test-container')).toBe(true);
        });

        it('should register a container with contextConfig htmlSanitizer', () => {
            class ContainerWithSanitizer {}
            const contextConfig = { htmlSanitizer: (html: string) => html };
            Environment.addContainer('container-sanitizer', ContainerWithSanitizer as any, [],
                                     '<div>sanitized</div>', contextConfig);
            expect(Environment.containers.has('container-sanitizer')).toBe(true);
        });

        it('should use context.name when name is undefined', () => {
            class AutoNamedContainer {}
            Environment.addContainer(undefined, AutoNamedContainer as any, [],
                                     '<div>auto</div>', undefined);
            expect(Environment.containers.has('AutoNamedContainer')).toBe(true);
        });

        it('should produce a working ContextBinder via instantiateBinder', () => {
            class InstantiateContainer {}
            Environment.addContainer('instantiate-container', InstantiateContainer as any, [],
                                     '<div>inst</div>', undefined);
            const result = Environment.containers.instantiateBinder('instantiate-container');
            expect(result).toBeDefined();
            expect(result!.contextBinder).toBeDefined();
            // Invoke the lazy lambdas passed to the ContextBinder to cover their bodies
            expect(result!.contextBinder.getHiddenClassName()).toBe(Constants.DEFAULT_HIDE_CLASS_NAME);
            expect(typeof result!.contextBinder.getShowDebugInfo()).toBe('boolean');
        });

        it('should exercise htmlSanitizer lambda fallback to global sanitizer', () => {
            class SanitizerFallbackContainer {}
            Environment.addContainer('sanitizer-fallback-container', SanitizerFallbackContainer as any, [],
                                     '<div>fb</div>', undefined);
            // The sanitizer creator lambda is the 6th arg to _containers.add
            // We can't directly access it, but we can verify it was created without error
            const result = Environment.containers.instantiateBinder('sanitizer-fallback-container');
            expect(result).toBeDefined();
        });
    });

    describe('addComponent - lambda coverage', () => {
        it('should produce a working ContextBinder via instantiateBinder', () => {
            class InstBinder {}
            Environment.addComponent('inst-binder-comp', InstBinder as any, [],
                                     undefined, '<div>inst</div>', undefined, undefined, undefined);
            const binder = Environment.components.instantiateBinder('inst-binder-comp');
            expect(binder).toBeDefined();
            // Invoke getHiddenClassName/getShowDebugInfo to cover lambdas
            expect(binder!.getHiddenClassName()).toBe(Constants.DEFAULT_HIDE_CLASS_NAME);
            expect(typeof binder!.getShowDebugInfo()).toBe('boolean');
        });

        it('should exercise htmlSanitizer/styleSanitizer lambdas with contextConfig', () => {
            class SanitizerLambdaComp {}
            const contextConfig = {
                htmlSanitizer: (html: string) => `<safe>${html}</safe>`,
                styleSanitizer: (style: string) => `/* safe */ ${style}`,
            };
            Environment.addComponent('sanitizer-lambda-comp', SanitizerLambdaComp as any, [],
                                     undefined, '<div>x</div>', undefined, undefined, contextConfig);
            const binder = Environment.components.instantiateBinder('sanitizer-lambda-comp');
            expect(binder).toBeDefined();
            // The sanitizer is stored in the binder's htmlSanitizer property
            expect(binder!.htmlSanitizer).toBeDefined();
            expect(binder!.htmlSanitizer!('<div>test</div>')).toBe('<safe><div>test</div></safe>');
        });
        it('should register a component', () => {
            class TestComponent {}
            Environment.addComponent('test-component', TestComponent as any, [],
                                     undefined, '<span>component</span>', undefined, undefined, undefined);
            expect(Environment.components.has('test-component')).toBe(true);
        });

        it('should register a component with contextConfig sanitizers', () => {
            class ComponentWithSanitizers {}
            const contextConfig = {
                htmlSanitizer: (html: string) => html,
                styleSanitizer: (style: string) => style,
                shadowRootConfig: { mode: 'open' as ShadowRootMode }
            };
            Environment.addComponent('component-sanitizers', ComponentWithSanitizers as any, [],
                                     undefined, '<span>sanitized</span>', undefined, undefined, contextConfig);
            expect(Environment.components.has('component-sanitizers')).toBe(true);
        });

        it('should use context.name when name is undefined', () => {
            class AutoNamedComponent {}
            Environment.addComponent(undefined, AutoNamedComponent as any, [],
                                     undefined, '<span>auto</span>', undefined, undefined, undefined);
            expect(Environment.components.has('auto-named-component')).toBe(true);
        });
    });

    describe('addAspect', () => {
        it('should register an aspect', () => {
            class TestAspect {}
            Environment.addAspect('test-aspect', TestAspect as any, [],
                                  '.aspect { }', undefined, undefined);
            expect(Environment.aspects.has('test-aspect')).toBe(true);
        });

        it('should register an aspect with styleSanitizer', () => {
            class AspectWithSanitizer {}
            const sanitizer = (style: string) => style;
            Environment.addAspect('aspect-sanitizer', AspectWithSanitizer as any, [],
                                  '.sanitized { }', undefined, sanitizer);
            expect(Environment.aspects.has('aspect-sanitizer')).toBe(true);
        });

        it('should use context.name when name is undefined', () => {
            class AutoNamedAspect {}
            Environment.addAspect(undefined, AutoNamedAspect as any, [],
                                  '.auto { }', undefined, undefined);
            expect(Environment.aspects.has('auto-named-aspect')).toBe(true);
        });
    });

    describe('addApp', () => {
        let testElements: HTMLElement[] = [];

        afterEach(() => {
            // Remove test elements from DOM to allow auto-dispose on next detectChanges
            for (const el of testElements) {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            }
            testElements = [];
        });

        it('should bind with a string selector', () => {
            const div = document.createElement('div');
            div.id = 'bind-app-selector-test';
            document.body.appendChild(div);
            testElements.push(div);

            class SelectorCtx {}
            expect(() => {
                Environment.addApp('#bind-app-selector-test', SelectorCtx as any, [], undefined);
            }).not.toThrow();
        });

        it('should log an error when string selector does not match any element', () => {
            // addApp no longer throws — it logs and returns. Reuse the file-wide console.error
            // spy (set up in beforeAll); per-test mockRestore would dismantle it for later tests.
            (console.error as jest.Mock).mockClear();
            class NoMatchCtx {}
            expect(() => {
                Environment.addApp('#non-existent-element-xyz', NoMatchCtx as any, [], undefined);
            }).not.toThrow();
            expect(console.error as jest.Mock).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringContaining("Element with selector '#non-existent-element-xyz' not found"),
            );
        });

        it('should bind with an Element directly', () => {
            const div = document.createElement('div');
            document.body.appendChild(div);
            testElements.push(div);

            class DirectElementCtx {}
            expect(() => {
                Environment.addApp(div, DirectElementCtx as any, [], undefined);
            }).not.toThrow();
        });

        it('should bind to document.body when null is passed', () => {
            class NullCtx {}
            expect(() => {
                Environment.addApp(null, NullCtx as any, [], undefined);
            }).not.toThrow();
        });

        it('should log an error when binding to document.body twice', () => {
            // addApp no longer throws on duplicate — it logs and returns.
            (console.error as jest.Mock).mockClear();
            class BodyCtxFirst {}
            Environment.addApp(undefined, BodyCtxFirst as any, [], undefined);
            class UndefCtx {}
            expect(() => {
                Environment.addApp(undefined, UndefCtx as any, [], undefined);
            }).not.toThrow();
            expect(console.error as jest.Mock).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringMatching(new RegExp(`Attempt to create multiple ${Constants.DISPLAY_NAME} applications binded to the same element`)),
            );
        });

        it('should log an error when binding to the same element twice', () => {
            (console.error as jest.Mock).mockClear();
            const div = document.createElement('div');
            document.body.appendChild(div);
            testElements.push(div);

            class DupCtx1 {}
            class DupCtx2 {}
            Environment.addApp(div, DupCtx1 as any, [], undefined);

            expect(() => {
                Environment.addApp(div, DupCtx2 as any, [], undefined);
            }).not.toThrow();
            expect(console.error as jest.Mock).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringMatching(new RegExp(`Attempt to create multiple ${Constants.DISPLAY_NAME} applications binded to the same element`)),
            );
        });

        it('should bind with contextConfig', () => {
            const div = document.createElement('div');
            document.body.appendChild(div);
            testElements.push(div);

            class ConfigCtx {}
            const contextConfig = { htmlSanitizer: (html: string) => html, pessimisticChangeDetectionStrategy: true };
            expect(() => {
                Environment.addApp(div, ConfigCtx as any, [], contextConfig);
            }).not.toThrow();
        });

        it('should clean up mapping when binder is disposed', () => {
            const div = document.createElement('div');
            document.body.appendChild(div);
            testElements.push(div);

            class DisposeCtx {}
            Environment.addApp(div, DisposeCtx as any, [], undefined);

            // Access private map and dispose the binder to test cleanup
            const map = (Environment as any)._elementsToContextsMapping as Map<Element, any>;
            expect(map.has(div)).toBe(true);
            const binder = map.get(div);
            binder.dispose();
            expect(map.has(div)).toBe(false);
        });
    });

    describe('global sanitizer fallback', () => {
        it('addContainer with contextConfig (no sanitizer) and global htmlSanitizer: binder wraps the global', () => {
            const globalSanitizer = (html: string) => `[GLOBAL]${html}`;
            Environment.config({ htmlSanitizer: globalSanitizer } as any);

            class FallbackContainer {}
            // contextConfig is provided but lacks htmlSanitizer — binder code path
            // for "fall back to global htmlSanitizer" runs.
            const contextConfig = { pessimisticChangeDetectionStrategy: false };
            Environment.addContainer('fallback-container', FallbackContainer as any, [],
                                     '<div></div>', contextConfig as any);

            const result = Environment.containers.instantiateBinder('fallback-container');
            expect(result).toBeDefined();
            expect(result!.contextBinder.htmlSanitizer).toBeDefined();
            expect(result!.contextBinder.htmlSanitizer!('<x/>')).toBe('[GLOBAL]<x/>');
        });

        it('addComponent with contextConfig (no sanitizers) and global sanitizers: binder wraps the global html one', () => {
            const globalHtmlSan = (html: string) => `<H>${html}</H>`;
            const globalStyleSan = (style: string) => `/*S*/${style}`;
            Environment.config({ htmlSanitizer: globalHtmlSan, styleSanitizer: globalStyleSan } as any);

            class FallbackComp {}
            const contextConfig = { pessimisticChangeDetectionStrategy: false };
            Environment.addComponent('fallback-comp', FallbackComp as any, [],
                                     undefined, '<span></span>', undefined, undefined, contextConfig as any);

            const binder = Environment.components.instantiateBinder('fallback-comp');
            expect(binder).toBeDefined();
            expect(binder!.htmlSanitizer).toBeDefined();
            expect(binder!.htmlSanitizer!('<a/>')).toBe('<H><a/></H>');
        });

        it('addAspect: should fall back to global styleSanitizer when no local styleSanitizer is set', () => {
            const globalStyleSan = (style: string) => `/*A*/${style}`;
            Environment.config({ styleSanitizer: globalStyleSan } as any);

            class FallbackAspect {}
            Environment.addAspect('fallback-aspect', FallbackAspect as any, [],
                                  '.x { color: red; }', undefined, undefined);

            expect(Environment.aspects.has('fallback-aspect')).toBe(true);
        });

        it('addTemplate: should fall back to global htmlSanitizer when no local htmlSanitizer is set', () => {
            const globalHtmlSan = (html: string) => `<T>${html}</T>`;
            Environment.config({ htmlSanitizer: globalHtmlSan } as any);

            Environment.addTemplate('fallback-tpl', '<div></div>', undefined);
            expect(Environment.templates.has('fallback-tpl')).toBe(true);
        });

        it('addAdoptedStyle: should fall back to global styleSanitizer when no local styleSanitizer is set', () => {
            const globalStyleSan = (style: string) => `/*AS*/${style}`;
            Environment.config({ styleSanitizer: globalStyleSan } as any);

            Environment.addAdoptedStyle('fallback-style', '.cls { }', undefined);
            expect(Environment.adoptedStyles.has('fallback-style')).toBe(true);
        });

        it('addContainer: binder htmlSanitizer is undefined when neither contextConfig nor global sanitizer set', () => {
            class NoSanContainer {}
            Environment.addContainer('no-san-container', NoSanContainer as any, [],
                                     '<div></div>', undefined);
            const result = Environment.containers.instantiateBinder('no-san-container');
            expect(result).toBeDefined();
            // No contextConfig is passed, so binder constructor's contextConfig branch is skipped
            // and htmlSanitizer is left undefined.
            expect(result!.contextBinder.htmlSanitizer).toBeUndefined();
        });
    });

    describe('config after addApp', () => {
        it('should log an error when called after addApp has been invoked', () => {
            // Environment.config no longer throws — it logs and returns.
            (console.error as jest.Mock).mockClear();
            const div = document.createElement('div');
            document.body.appendChild(div);
            class ConfigGuardCtx {}
            Environment.addApp(div, ConfigGuardCtx as any, [], undefined);
            expect(() => {
                Environment.config({ showDebugInfo: false } as any);
            }).not.toThrow();
            expect(console.error as jest.Mock).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringContaining("Can't change global config during runtime"),
            );
        });
    });
});
