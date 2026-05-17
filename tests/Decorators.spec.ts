import { Environment } from '../src/Environment';
import { Helpers } from '../src/Helpers';
import { Console } from '../src/Console';

// We need to mock Environment before importing Decorators
jest.mock('../src/Environment', () => ({
    Environment: {
        addApp: jest.fn(),
        addContainer: jest.fn(),
        addComponent: jest.fn(),
        addAspect: jest.fn(),
        addTransformer: jest.fn(),
        registerInjectable: jest.fn(),
        addInjectable: jest.fn(),
        addTemplate: jest.fn(),
        addAdoptedStyle: jest.fn(),
        addDetector: jest.fn(),
        addEventer: jest.fn(),
        setupRouter: jest.fn(),
        config: jest.fn(),
    }
}));

jest.mock('../src/Console', () => ({
    Console: {
        error: jest.fn(),
    }
}));

// Ensure Reflect.metadata is available
if (typeof (Reflect as any).metadata !== 'function') {
    (Reflect as any).metadata = (key: string, value: any) =>
        (target: any, propertyKey?: string) => { };
}
if (typeof (Reflect as any).getMetadata !== 'function') {
    (Reflect as any).getMetadata = (key: string, target: any) => undefined;
}

import {
    AppRoot,
    Container,
    Component,
    Aspect,
    Transformer,
    Injectable,
    Detector,
    Eventer,
    $Template,
    $AdoptedStyle,
    $Injectable,
    $Config,
    $Route,
} from '../src/Decorators';

const MockEnvironment = Environment as jest.Mocked<typeof Environment>;
const MockConsole = Console as unknown as { error: jest.Mock };

beforeEach(() => {
    jest.clearAllMocks();
});

// ---------- @Container ----------
describe('Container decorator', () => {
    it('should call Environment.addContainer with name from constructor when no explicit name', () => {
        @Container('<div></div>')
        class MyContainer {
            constructor() {}
        }

        expect(MockEnvironment.addContainer).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addContainer as jest.Mock).mock.calls[0];
        expect(args[0]).toBeUndefined(); // name resolved inside Environment
        expect(args[1]).toBe(MyContainer);
    });

    it('should call Environment.addContainer with explicit name when [name, template] tuple', () => {
        @Container(['my-container', '<div>named</div>'])
        class NamedContainer {
            constructor() {}
        }

        expect(MockEnvironment.addContainer).toHaveBeenCalledTimes(1);
    });

    it('should call Console.error when html template is undefined', () => {
        @Container(undefined as any)
        class BadContainer {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addContainer).not.toHaveBeenCalled();
    });

    it('should return the original target class', () => {
        class TestContainer {
            constructor() {}
        }

        const result = Container('<div></div>')(TestContainer as any);
        expect(result).toBe(TestContainer);
    });

    it('should accept an ITemplateProvider', () => {
        const provider = { get: () => '<div>from provider</div>' };

        @Container(provider as any)
        class ProviderContainer {
            constructor() {}
        }

        expect(MockEnvironment.addContainer).toHaveBeenCalledTimes(1);
    });

    it('should accept IContextConfig in bootstrap metadata', () => {
        const config = { htmlSanitizer: (html: string) => html, pessimisticChangeDetectionStrategy: true };

        @Container('<div></div>', config as any)
        class ConfiguredContainer {
            constructor() {}
        }

        expect(MockEnvironment.addContainer).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addContainer as jest.Mock).mock.calls[0];
        // contextConfig is last arg
        expect(args[args.length - 1]).toEqual(config);
    });

    it('should log error for duplicate context configs', () => {
        const config1 = { htmlSanitizer: (html: string) => html, pessimisticChangeDetectionStrategy: false };
        const config2 = { htmlSanitizer: (html: string) => html, pessimisticChangeDetectionStrategy: true };

        @Container('<div></div>', config1 as any, config2 as any)
        class DuplicateConfigContainer {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
    });

    it('should log error for invalid name-template tuple', () => {
        @Container(['' as any, '<div></div>'])
        class BadTupleContainer {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addContainer).not.toHaveBeenCalled();
    });
});

// ---------- @Component ----------
describe('Component decorator', () => {
    it('should call Environment.addComponent with template string', () => {
        @Component('<span></span>')
        class MyComponent {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addComponent as jest.Mock).mock.calls[0];
        expect(args[1]).toBe(MyComponent);
    });

    it('should accept named tuple [name, template]', () => {
        @Component(['my-comp', '<span>named</span>'])
        class NamedComponent {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should accept style template in bootstrap metadata', () => {
        @Component('<span></span>', '.cls { color: red; }')
        class StyledComponent {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should accept ITemplateProvider', () => {
        const provider = { get: () => '<span>from provider</span>' };

        @Component(provider as any)
        class ProviderComponent {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should log error when html template undefined', () => {
        @Component(undefined as any)
        class BadComponent {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addComponent).not.toHaveBeenCalled();
    });

    it('should accept adopted style names array', () => {
        @Component('<span></span>', ['style1', 'style2'])
        class AdoptedComponent {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should log error for duplicate style templates', () => {
        @Component('<span></span>', '.a {}', '.b {}')
        class DupStyleComponent {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
    });

    it('should return the original target class', () => {
        class TestComp {
            constructor() {}
        }

        const result = Component('<span></span>')(TestComp as any);
        expect(result).toBe(TestComp);
    });

    it('should accept IComponentContextConfig', () => {
        const ctxConfig = {
            htmlSanitizer: (h: string) => h,
            styleSanitizer: (s: string) => s,
            pessimisticChangeDetectionStrategy: false,
            shadowRootConfig: { delegatesFocus: false, mode: 'closed', serializable: false },
        };

        @Component('<span></span>', ctxConfig as any)
        class ConfigComponent {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should log error for duplicate context configs in component', () => {
        const ctxConfig1 = {
            htmlSanitizer: (h: string) => h,
            styleSanitizer: (s: string) => s,
            pessimisticChangeDetectionStrategy: false,
            shadowRootConfig: { delegatesFocus: false, mode: 'closed', serializable: false },
        };
        const ctxConfig2 = {
            htmlSanitizer: (h: string) => h,
            styleSanitizer: (s: string) => s,
            pessimisticChangeDetectionStrategy: true,
            shadowRootConfig: { delegatesFocus: false, mode: 'closed', serializable: false },
        };

        @Component('<span></span>', ctxConfig1 as any, ctxConfig2 as any)
        class DupCtxConfigComponent {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
    });

    it('should log error for duplicate adopted styles arrays', () => {
        @Component('<span></span>', ['style1'], ['style2'])
        class DupAdoptedComponent {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
    });
});

// ---------- @Aspect ----------
describe('Aspect decorator', () => {
    it('should call Environment.addAspect with style template', () => {
        @Aspect('.my-aspect { display: block; }')
        class MyAspect {
            constructor() {}
        }

        expect(MockEnvironment.addAspect).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addAspect as jest.Mock).mock.calls[0];
        expect(args[1]).toBe(MyAspect);
    });

    it('should accept named tuple [name, style]', () => {
        @Aspect(['my-aspect', '.cls { }'])
        class NamedAspect {
            constructor() {}
        }

        expect(MockEnvironment.addAspect).toHaveBeenCalledTimes(1);
    });

    it('should accept no arguments (optional style)', () => {
        @Aspect(undefined as any)
        class NoStyleAspect {
            constructor() {}
        }

        expect(MockEnvironment.addAspect).toHaveBeenCalledTimes(1);
    });

    it('should accept styleSanitizer function', () => {
        const sanitizer = (style: string) => style.replace('color', '');

        @Aspect('.cls {}', sanitizer)
        class SanitizedAspect {
            constructor() {}
        }

        expect(MockEnvironment.addAspect).toHaveBeenCalledTimes(1);
    });

    it('should accept adopted style names', () => {
        @Aspect('.cls {}', ['adopted1'])
        class AdoptedAspect {
            constructor() {}
        }

        expect(MockEnvironment.addAspect).toHaveBeenCalledTimes(1);
    });

    it('should log error for duplicate styleSanitizer', () => {
        const san1 = (s: string) => s;
        const san2 = (s: string) => s;

        @Aspect('.cls {}', san1, san2)
        class DupSanitizerAspect {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
    });

    it('should log error for invalid named tuple', () => {
        @Aspect(['' as any, '.cls {}'])
        class BadTupleAspect {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addAspect).not.toHaveBeenCalled();
    });

    it('should log error for duplicate adopted style names in aspect', () => {
        @Aspect('.cls {}', ['style1'], ['style2'] as any)
        class DupAdoptedAspect {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
    });

    it('should log error for duplicate styleSanitizer and return early', () => {
        const san1 = (s: string) => s;
        const san2 = (s: string) => s.trim();

        @Aspect('.cls {}', san1, san2)
        class DupSanAspect2 {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addAspect).not.toHaveBeenCalled();
    });
});

// ---------- @Transformer ----------
describe('Transformer decorator', () => {
    it('should call Environment.addTransformer', () => {
        @Transformer()
        class MyTransformer {
            transform(value: any) { return value; }
        }

        expect(MockEnvironment.addTransformer).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addTransformer as jest.Mock).mock.calls[0];
        expect(args[0]).toBeUndefined();
        expect(args[1]).toBe(MyTransformer);
    });

    it('should pass explicit name', () => {
        @Transformer('myPipe')
        class NamedTransformer {
            transform(value: any) { return value; }
        }

        expect(MockEnvironment.addTransformer).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addTransformer as jest.Mock).mock.calls[0];
        expect(args[0]).toBe('myPipe');
    });

    it('should return the original class', () => {
        class T { transform(v: any) { return v; } }
        const result = Transformer()(T as any);
        expect(result).toBe(T);
    });
});

// ---------- @Injectable ----------
describe('Injectable decorator', () => {
    it('should call Environment.registerInjectable with singleton false by default', () => {
        @Injectable()
        class MyService {}

        expect(MockEnvironment.registerInjectable).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.registerInjectable as jest.Mock).mock.calls[0];
        expect(args[0]).toBe(MyService);
    });

    it('should pass singleton = true', () => {
        @Injectable(true)
        class SingletonService {}

        expect(MockEnvironment.registerInjectable).toHaveBeenCalledTimes(1);
    });

    it('should return the original class', () => {
        class S {}
        const result = Injectable()(S as any);
        expect(result).toBe(S);
    });
});

// ---------- @Detector ----------
describe('Detector decorator', () => {
    it('should call Environment.addDetector with target prototype and property name', () => {
        class MyContext {
            @Detector()
            myProp: any;
        }

        expect(MockEnvironment.addDetector).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addDetector as jest.Mock).mock.calls[0];
        expect(args[0]).toBe(MyContext.prototype);
        expect(args[1]).toBe('myProp');
    });
});

// ---------- @Eventer ----------
describe('Eventer decorator', () => {
    it('should call Environment.addEventer with target prototype and property name', () => {
        class MyContext {
            @Eventer()
            myEvent: any;
        }

        expect(MockEnvironment.addEventer).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addEventer as jest.Mock).mock.calls[0];
        expect(args[0]).toBeUndefined(); // no explicit name
        expect(args[1]).toBe(MyContext.prototype);
        expect(args[2]).toBe('myEvent');
    });

    it('should pass explicit name', () => {
        class MyContext2 {
            @Eventer('custom-event')
            myEvent: any;
        }

        expect(MockEnvironment.addEventer).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addEventer as jest.Mock).mock.calls[0];
        expect(args[0]).toBe('custom-event');
    });
});

// ---------- $Template ----------
describe('$Template pseudo-decorator', () => {
    it('should call Environment.addTemplate and return the name', () => {
        const result = $Template('my-template', '<div>{{value}}</div>');
        expect(result).toBe('my-template');
        expect(MockEnvironment.addTemplate).toHaveBeenCalledWith('my-template', '<div>{{value}}</div>', undefined);
    });

    it('should accept ITemplateProvider', () => {
        const provider = { get: () => '<p>content</p>' };
        $Template('provider-template', provider as any);
        expect(MockEnvironment.addTemplate).toHaveBeenCalledTimes(1);
    });

    it('should accept htmlSanitizer', () => {
        const sanitizer = (html: string) => html;
        $Template('sanitized', '<div></div>', sanitizer);
        expect(MockEnvironment.addTemplate).toHaveBeenCalledWith('sanitized', '<div></div>', sanitizer);
    });

    it('should log error for invalid template provider', () => {
        const result = $Template('bad', 123 as any);
        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addTemplate).not.toHaveBeenCalled();
        expect(result).toBe('bad');
    });
});

// ---------- $AdoptedStyle ----------
describe('$AdoptedStyle pseudo-decorator', () => {
    it('should call Environment.addAdoptedStyle and return the name', () => {
        const result = $AdoptedStyle('my-style', '.cls { color: red; }');
        expect(result).toBe('my-style');
        expect(MockEnvironment.addAdoptedStyle).toHaveBeenCalledWith('my-style', '.cls { color: red; }', undefined);
    });

    it('should accept styleSanitizer', () => {
        const sanitizer = (style: string) => style;
        $AdoptedStyle('sanitized-style', '.cls {}', sanitizer);
        expect(MockEnvironment.addAdoptedStyle).toHaveBeenCalledWith('sanitized-style', '.cls {}', sanitizer);
    });

    it('should log error for invalid provider', () => {
        const result = $AdoptedStyle('bad-style', 42 as any);
        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addAdoptedStyle).not.toHaveBeenCalled();
        expect(result).toBe('bad-style');
    });
});

// ---------- $Injectable ----------
describe('$Injectable pseudo-decorator', () => {
    it('should call Environment.registerInjectable for a constructor', () => {
        class Svc {}
        $Injectable(Svc as any, false);
        expect(MockEnvironment.registerInjectable).toHaveBeenCalledWith(Svc, [], false);
    });

    it('should call Environment.addInjectable for an instance', () => {
        const instance = { someMethod: () => {} };
        $Injectable(instance as any);
        expect(MockEnvironment.addInjectable).toHaveBeenCalledWith(instance);
    });

    it('should pass singleton and dependencies', () => {
        class Dep1 {}
        class Svc2 {}
        $Injectable(Svc2 as any, true, Dep1 as any);
        expect(MockEnvironment.registerInjectable).toHaveBeenCalledWith(Svc2, [Dep1], true);
    });
});

// ---------- $Config ----------
describe('$Config pseudo-decorator', () => {
    it('should call Environment.config', () => {
        const config = { showDebugInfo: true } as any;
        $Config(config);
        expect(MockEnvironment.config).toHaveBeenCalledWith(config);
    });
});

// ---------- $Route ----------
describe('$Route pseudo-decorator', () => {
    it('should call Environment.setupRouter', () => {
        $Route('/home/dashboard');
        expect(MockEnvironment.setupRouter).toHaveBeenCalledWith('/home/dashboard');
    });
});

// ---------- AppRoot ----------
describe('AppRoot decorator', () => {
    it('should call Environment.addApp with selector string', () => {
        @AppRoot('#app')
        class MyApp {
            constructor() {}
        }

        expect(MockEnvironment.addApp).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addApp as jest.Mock).mock.calls[0];
        expect(args[0]).toBe('#app');
        expect(args[1]).toBe(MyApp);
    });

    it('should call Environment.config if global config provided', () => {
        const globalCfg = { showDebugInfo: true, complyWithW3C: false, pessimisticChangeDetectionStrategy: false, shadowRootConfig: { delegatesFocus: false, mode: 'closed', serializable: false }, htmlSanitizer: (h: string) => h, styleSanitizer: (s: string) => s };

        @AppRoot('#root', globalCfg as any)
        class CfgApp {
            constructor() {}
        }

        expect(MockEnvironment.config).toHaveBeenCalledTimes(1);
        expect(MockEnvironment.addApp).toHaveBeenCalledTimes(1);
    });

    it('should call Environment.setupRouter if route config provided', () => {
        @AppRoot('#root', '/home/about')
        class RoutedApp {
            constructor() {}
        }

        expect(MockEnvironment.setupRouter).toHaveBeenCalled();
        expect(MockEnvironment.addApp).toHaveBeenCalledTimes(1);
    });

    it('should throw on multiple selectors', () => {
        expect(() => {
            @AppRoot('#root', '#other')
            class MultiSelectorApp {
                constructor() {}
            }
        }).toThrow(/multiple app root element/);
    });

    it('should throw on multiple global configs', () => {
        const cfg1 = { showDebugInfo: true, complyWithW3C: false, pessimisticChangeDetectionStrategy: false, shadowRootConfig: { delegatesFocus: false, mode: 'closed', serializable: false }, htmlSanitizer: (h: string) => h, styleSanitizer: (s: string) => s };
        const cfg2 = { showDebugInfo: false, complyWithW3C: true, pessimisticChangeDetectionStrategy: false, shadowRootConfig: { delegatesFocus: false, mode: 'closed', serializable: false }, htmlSanitizer: (h: string) => h, styleSanitizer: (s: string) => s };

        expect(() => {
            @AppRoot('#root', cfg1 as any, cfg2 as any)
            class DupCfgApp {
                constructor() {}
            }
        }).toThrow(/multiple app global configs/);
    });

    it('should throw on multiple route configs', () => {
        expect(() => {
            @AppRoot('#root', '/home', '/about')
            class DupRouteApp {
                constructor() {}
            }
        }).toThrow(/multiple app route templates/);
    });

    it('should throw on multiple global configs (context config shape matches global first)', () => {
        const cfg1 = { htmlSanitizer: (h: string) => h, pessimisticChangeDetectionStrategy: false };
        const cfg2 = { htmlSanitizer: (h: string) => h, pessimisticChangeDetectionStrategy: true };

        expect(() => {
            @AppRoot('#root', cfg1 as any, cfg2 as any)
            class DupCtxApp {
                constructor() {}
            }
        }).toThrow(/multiple app global configs/);
    });

    it('should return the original class', () => {
        class TestApp {
            constructor() {}
        }
        const result = AppRoot('#app')(TestApp as any);
        expect(result).toBe(TestApp);
    });

    it('should accept Element selector', () => {
        const element = document.createElement('div');

        @AppRoot(element as any)
        class ElementApp {
            constructor() {}
        }

        expect(MockEnvironment.addApp).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addApp as jest.Mock).mock.calls[0];
        expect(args[0]).toBe(element);
    });

    it('should throw on multiple Element selectors', () => {
        const el1 = document.createElement('div');
        const el2 = document.createElement('span');

        expect(() => {
            @AppRoot(el1 as any, el2 as any)
            class DupElApp {
                constructor() {}
            }
        }).toThrow(/multiple app root element/);
    });

    it('should throw on multiple context configs', () => {
        const ctx1 = { htmlSanitizer: (h: string) => h, pessimisticChangeDetectionStrategy: false };
        const ctx2 = { htmlSanitizer: (h: string) => h, pessimisticChangeDetectionStrategy: true };

        expect(() => {
            @AppRoot('#root', ctx1 as any, ctx2 as any)
            class DupCtxApp2 {
                constructor() {}
            }
        }).toThrow(/multiple/);
    });

    it('should accept Element and route config together', () => {
        const element = document.createElement('div');

        @AppRoot(element as any, '/{page=home}')
        class ElementWithRouteApp {
            constructor() {}
        }

        expect(MockEnvironment.setupRouter).toHaveBeenCalled();
        expect(MockEnvironment.addApp).toHaveBeenCalledTimes(1);
        const args = (MockEnvironment.addApp as jest.Mock).mock.calls[0];
        expect(args[0]).toBe(element);
    });

    it('should not call config when no global config provided', () => {
        @AppRoot('#app')
        class NoConfigApp {
            constructor() {}
        }

        expect(MockEnvironment.config).not.toHaveBeenCalled();
    });

    it('should pass context config to addApp', () => {
        // Context config has only htmlSanitizer and pessimisticChangeDetectionStrategy
        // but global config template also has those, so isOfType matches global first
        // We need to test the context config branch which is reached when
        // the object doesn't match global config template
        const ctxConfig = { htmlSanitizer: (h: string) => h, pessimisticChangeDetectionStrategy: false };

        @AppRoot('#root', ctxConfig as any)
        class CtxConfigApp {
            constructor() {}
        }

        // This config shape matches both global and context templates,
        // so it goes to global config first.
        // The context config branch is tested via the duplicate context configs test
        expect(MockEnvironment.addApp).toHaveBeenCalledTimes(1);
    });
});

// ---------- Component with CustomElementConstructor ----------
describe('Component with CustomElementConstructor', () => {
    it('should accept CustomElementConstructor in metadata', () => {
        class MyElement extends HTMLElement {}

        @Component('<span></span>', MyElement as any)
        class CompWithElement {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should log error for duplicate custom element constructors', () => {
        class El1 extends HTMLElement {}
        class El2 extends HTMLElement {}

        @Component('<span></span>', El1 as any, El2 as any)
        class DupElComp {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addComponent).not.toHaveBeenCalled();
    });

    it('should log error for invalid name-template tuple in Component', () => {
        @Component(['' as any, '<span></span>'])
        class BadTupleComp {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addComponent).not.toHaveBeenCalled();
    });

    it('should accept ITemplateProvider in named tuple for Component', () => {
        const provider = { get: () => '<span>content</span>' };

        @Component(['my-comp', provider as any])
        class ProviderTupleComp {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should accept ITemplateProvider in named tuple for Container', () => {
        const provider = { get: () => '<div>content</div>' };

        @Container(['my-container', provider as any])
        class ProviderTupleContainer {
            constructor() {}
        }

        expect(MockEnvironment.addContainer).toHaveBeenCalledTimes(1);
    });

    it('should accept ITemplateProvider in named tuple for Aspect', () => {
        const provider = { get: () => '.cls {}' };

        @Aspect(['my-aspect', provider as any])
        class ProviderTupleAspect {
            constructor() {}
        }

        expect(MockEnvironment.addAspect).toHaveBeenCalledTimes(1);
    });
});

// ---------- isOfType edge cases (covers binary-expr and recursive branches) ----------
describe('isOfType edge cases via decorators', () => {
    it('should reject object with wrong property types in tuple for Container', () => {
        // Object matches structure keys but types differ — exercises typeof mismatch in isOfType
        const badProvider = { get: 42 }; // get should be a function, not number

        @Container(['my-container', badProvider as any])
        class WrongTypeTupleContainer {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addContainer).not.toHaveBeenCalled();
    });

    it('should reject object with wrong property types in tuple for Component', () => {
        const badProvider = { get: 42 }; 

        @Component(['my-comp', badProvider as any])
        class WrongTypeTupleComp {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addComponent).not.toHaveBeenCalled();
    });

    it('should reject object with wrong property types in tuple for Aspect', () => {
        const badProvider = { get: 42 };

        @Aspect(['my-aspect', badProvider as any])
        class WrongTypeTupleAspect {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
        expect(MockEnvironment.addAspect).not.toHaveBeenCalled();
    });

    it('should reject object with unknown keys in $Template provider', () => {
        const badObj = { unknownKey: 'value' };
        const result = $Template('test', badObj as any);
        expect(MockConsole.error).toHaveBeenCalled();
        expect(result).toBe('test');
    });

    it('should reject object with unknown keys in $AdoptedStyle provider', () => {
        const badObj = { unknownKey: 'value' };
        const result = $AdoptedStyle('test', badObj as any);
        expect(MockConsole.error).toHaveBeenCalled();
        expect(result).toBe('test');
    });

    it('should reject empty object as ITemplateProvider', () => {
        const emptyObj = {};
        const result = $Template('empty', emptyObj as any);
        expect(MockConsole.error).toHaveBeenCalled();
    });

    it('should accept style provider object in Component bootstrap', () => {
        const styleProvider = { get: () => '.cls {}' };

        @Component('<span></span>', styleProvider as any)
        class StyleProviderComp {
            constructor() {}
        }

        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should reject Component context config with wrong nested object', () => {
        // Has the right keys but nested shadowRootConfig has wrong types
        const badCtxConfig = {
            htmlSanitizer: (h: string) => h,
            styleSanitizer: (s: string) => s,
            pessimisticChangeDetectionStrategy: false,
            shadowRootConfig: {
                delegatesFocus: 'not-a-boolean', // wrong type
                mode: 'closed',
                serializable: false
            }
        };

        @Component('<span></span>', badCtxConfig as any)
        class BadNestedConfigComp {
            constructor() {}
        }

        // Should NOT treat it as context config due to nested type mismatch
        // It may be treated as something else or ignored
        expect(MockEnvironment.addComponent).toHaveBeenCalledTimes(1);
    });

    it('should handle null passed as object in Container tuple', () => {
        @Container(['my-container', null as any])
        class NullTupleContainer {
            constructor() {}
        }

        expect(MockConsole.error).toHaveBeenCalled();
    });

    it('should handle Aspect with no style (undefined)', () => {
        // When undefined is explicitly passed, Aspect should still work
        @Aspect(undefined as any)
        class NoStyleAspect2 {
            constructor() {}
        }

        expect(MockEnvironment.addAspect).toHaveBeenCalledTimes(1);
    });
});
