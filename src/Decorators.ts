import { IContextConstructor, IContext } from './interfaces/contexts/IContext';
import { IComponentContextConstructor, IComponentContext } from './interfaces/contexts/IComponentContext';
import { IAspectContextConstructor } from './interfaces/contexts/IAspectContext';
import { ITransformerContextConstructor } from './interfaces/contexts/ITransformerContext';
import { IEntityDependencyConstructor } from './interfaces/IEntityDependencyConstructor';
import { IInjectableConstructor, IInjectable } from './interfaces/IInjectable';

import { IGlobalConfig } from './interfaces/IGlobalConfig';
import { IContextConfig } from './interfaces/contexts/configs/IContextConfig';
import { IComponentContextConfig } from './interfaces/contexts/configs/IComponentContextConfig';

import { ITemplateProvider } from './interfaces/ITemplateProvider';

import { Environment } from './Environment';

import { Helpers } from './Helpers';
import { Console } from './Console';
import { Constants } from './Constants';

//reflect
const REFLECT = (<any>Reflect);

//type matching
const GLOBAL_CONFIG_TEMPLATE: IGlobalConfig = {
    showDebugInfo: false,
    complyWithW3C: false,
    pessimisticChangeDetectionStrategy: false,
    shadowRootConfig: {
        delegatesFocus: false,
        mode: 'closed',
        serializable: false
    },
    htmlSanitizer: (html: string) => html,
    styleSanitizer: (style: string) => style,
}

const CONTEXT_CONFIG_TEMPLATE: IContextConfig = {
    htmlSanitizer: html => html,
    pessimisticChangeDetectionStrategy: false,
};

const COMPONENT_CONTEXT_CONFIG_TEMPLATE: IComponentContextConfig = {
    htmlSanitizer: html => html,
    styleSanitizer: style => style,
    pessimisticChangeDetectionStrategy: false,
    shadowRootConfig: {
        delegatesFocus: false,
        mode: 'closed',
        serializable: false
    }
};

const TEMPLATE_PROVIDER_TEMPLATE: ITemplateProvider = {
    get: () => ''
};

/**
 * Register the application root.
 *
 * @param appBootstrapMetaData bootstrap metadata:
 * * string: if it starts with '/' - the app route template; otherwise the app root element selector
 * * Element: app root element
 * * IContextConfig: root context (decorated class) configuration
 * * IGlobalConfig: global configuration
 * * Array<string>: $Template or $AdoptedStyle registration
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used globally or in the application root
 */
export function AppRoot<T extends IContextConstructor>(...appBootstrapMetaData: Array<string | Element | IContextConfig | IGlobalConfig | 
                                                                                Array<string> | IEntityDependencyConstructor>): (target: T) => T {
    return (target: T) => {
        let selectorOrElement: string | Element | undefined;
        let routeConfig: string | undefined;
        let contextConfig: IContextConfig | undefined;
        let globalConfig: IGlobalConfig | undefined;

        for (const el of appBootstrapMetaData) {
            if (Helpers.isNotEmptyString(el) || (el instanceof Element)) {
                let selectorOrElementValidationMessage: string | undefined;

                if (Helpers.isString(el)) {
                    const trimmedEL = (<string>el).trim();
                    if (trimmedEL.startsWith('/')) {
                        if (Helpers.isUndefined(routeConfig)) {
                            routeConfig = trimmedEL;
                        } else {
                            throw new Error(`${Constants.DISPLAY_NAME}: wrong app initialization meta data detected: multiple app route templates found.`);
                        }
                    } else {
                        if (Helpers.isUndefined(selectorOrElement)) {
                            selectorOrElement = trimmedEL;
                        } else {
                            selectorOrElementValidationMessage = `${Constants.DISPLAY_NAME}: wrong app initialization meta data detected: multiple app root element or element selector found.\nIf you are trying to configure route, then route config should start from "/".`;
                        }
                    }
                } else {
                    if (Helpers.isUndefined(selectorOrElement)) {
                        selectorOrElement = <Element>el;
                    } else {
                        selectorOrElementValidationMessage = `${Constants.DISPLAY_NAME}: wrong app initialization meta data detected: multiple app root element or element selector found.`;
                    }
                }

                if (Helpers.isNotEmptyString(selectorOrElementValidationMessage)) {
                    throw new Error(selectorOrElementValidationMessage);
                }
            } else if (Helpers.isObject(el)) {
                if (isOfType(<object>el, GLOBAL_CONFIG_TEMPLATE)) {
                    if (Helpers.isUndefined(globalConfig)) {
                        globalConfig = <IGlobalConfig>el;
                    } else {
                        throw new Error(`${Constants.DISPLAY_NAME}: wrong app initialization meta data detected: multiple app global configs found.`);
                    }
                } else if (isOfType(<object>el, CONTEXT_CONFIG_TEMPLATE)) {
                    if (Helpers.isUndefined(contextConfig)) {
                        contextConfig = <IContextConfig>el;
                    } else {
                        throw new Error(`${Constants.DISPLAY_NAME}: wrong app initialization meta data detected: multiple app context configs found.`);
                    }
                }
            }
        }

        if (!Helpers.isUndefined(globalConfig)) {
            Environment.config(globalConfig!);
        }

        Environment.setupRouter(routeConfig);
        Environment.addApp(selectorOrElement, target, getConstructorInjections(target), contextConfig);
        
        return target;
    };
}

/**
 * Register a container - a swappable HTML template with context.
 *
 * @param htmlTemplateOrPath HTML template or path to an HTML template file
 * @param containerBootstrapMetaData bootstrap metadata:
 * * IContextConfig: container context configuration
 * * Array<string>: $Template or $AdoptedStyle registration
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the container or its child entities
 */
export function Container<T extends IContextConstructor>(htmlTemplateOrPath: string,
                                                         ...containerBootstrapMetaData: Array<IContextConfig | Array<string> | IEntityDependencyConstructor>): (target: T) => T;
/**
 * Register a container - a swappable HTML template with context.
 *
 * @param htmlTemplateProvider HTML template provider
 * @param containerBootstrapMetaData bootstrap metadata:
 * * IContextConfig: container context configuration
 * * Array<string>: $Template or $AdoptedStyle registration
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the container or its child entities
 */
export function Container<T extends IContextConstructor>(htmlTemplateProvider: ITemplateProvider,
                                                         ...containerBootstrapMetaData: Array<IContextConfig | Array<string> | IEntityDependencyConstructor>): (target: T) => T;
/**
 * Register a container - a swappable HTML template with context.
 *
 * @param nameWithHtmlTemplateOrPath [container name, HTML template or path to an HTML template file]
 * @param containerBootstrapMetaData bootstrap metadata:
 * * IContextConfig: container context configuration
 * * Array<string>: $Template or $AdoptedStyle registration
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the container or its child entities
 */
export function Container<T extends IContextConstructor>(nameWithHtmlTemplateOrPath: [string, string],
                                                         ...containerBootstrapMetaData: Array<IContextConfig | Array<string> | IEntityDependencyConstructor>): (target: T) => T;
/**
 * Register a container - a swappable HTML template with context.
 *
 * @param nameWithHtmlTemplateProvider [container name, HTML template provider]
 * @param containerBootstrapMetaData bootstrap metadata:
 * * IContextConfig: container context configuration
 * * Array<string>: $Template or $AdoptedStyle registration
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the container or its child entities
 */
export function Container<T extends IContextConstructor>(nameWithHtmlTemplateProvider: [string, ITemplateProvider],
                                                         ...containerBootstrapMetaData: Array<IContextConfig | Array<string> | IEntityDependencyConstructor>): (target: T) => T;
export function Container<T extends IContextConstructor>(htmlTemplateOrPathOrProviderWithOrWithoutName: string | ITemplateProvider | [string, string | ITemplateProvider], 
                                                         ...containerBootstrapMetaData: Array<IContextConfig | Array<string> | IEntityDependencyConstructor>): (target: T) => T {
    return (target: T) => {
        let name: string | undefined;
        let htmlTemplateOrPathOrProvider: string | ITemplateProvider;
        let contextConfig: IContextConfig | undefined;

        if (Helpers.isArray(htmlTemplateOrPathOrProviderWithOrWithoutName)) {
            let [draftName, draftHtmlTemplateOrPathOrProvider] = <[string, string | ITemplateProvider]>htmlTemplateOrPathOrProviderWithOrWithoutName;
            if (!Helpers.isNotEmptyString(draftName) || 
                (!Helpers.isString(draftHtmlTemplateOrPathOrProvider) && 
                 (!Helpers.isObject(draftHtmlTemplateOrPathOrProvider) || 
                  (Helpers.isObject(draftHtmlTemplateOrPathOrProvider) && !isOfType(<object>draftHtmlTemplateOrPathOrProvider, TEMPLATE_PROVIDER_TEMPLATE))))) {
                Console.error(target, 'wrong container initialization meta data detected: there should be only 2 elements in configuration array: 1: container name, 2: html template or html template provider or html template url');
                return target;
            }

            name = draftName;
            htmlTemplateOrPathOrProvider = draftHtmlTemplateOrPathOrProvider;
        } else {
            htmlTemplateOrPathOrProvider = <string | ITemplateProvider>htmlTemplateOrPathOrProviderWithOrWithoutName;
        }

        if (Helpers.isUndefined(htmlTemplateOrPathOrProvider)) {
            Console.error(target, 'wrong container initialization meta data detected: html template not found.');
            return target;
        }

        for (const el of containerBootstrapMetaData) {
            if (Helpers.isObject(el)) {
                if (isOfType(<object>el, CONTEXT_CONFIG_TEMPLATE)) {
                    if (Helpers.isUndefined(contextConfig)) {
                        contextConfig = <IContextConfig>el;
                    } else {
                        Console.error(target, `${Constants.DISPLAY_NAME}: wrong container initialization meta data detected: multiple container context configs found.`);
                        return target;
                    }
                }
            }
        }

        Environment.addContainer(name, target, getConstructorInjections(target),
                                 htmlTemplateOrPathOrProvider!, contextConfig);

        return target;
    };
}

/**
 * Register a component - a reusable, isolated component with context.
 *
 * @param htmlTemplateOrPath HTML template or path to an HTML template file
 * @param componentBootstrapMetaData bootstrap metadata:
 * * CustomElementConstructor: Web Component element class extending HTMLElement
 * * string: path to a style template
 * * ITemplateProvider: a provider that returns the style template
 * * IComponentContextConfig: component context configuration
 * * Array<string>: adopted-style names
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the component or its child entities
 */
export function Component<T extends IComponentContextConstructor>(htmlTemplateOrPath: string,
                                                                  ...componentBootstrapMetaData: Array<CustomElementConstructor | string | ITemplateProvider | IComponentContextConfig |
                                                                                                       Array<string> | IEntityDependencyConstructor>): (target: T) => T;
/**
 * Register a component - a reusable, isolated component with context.
 *
 * @param htmlTemplateProvider HTML template provider
 * @param componentBootstrapMetaData bootstrap metadata:
 * * CustomElementConstructor: Web Component element class extending HTMLElement
 * * string: path to a style template
 * * ITemplateProvider: a provider that returns the style template
 * * IComponentContextConfig: component context configuration
 * * Array<string>: adopted-style names
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the component or its child entities
 */
export function Component<T extends IComponentContextConstructor>(htmlTemplateProvider: ITemplateProvider,
                                                                  ...componentBootstrapMetaData: Array<CustomElementConstructor | string | ITemplateProvider | IComponentContextConfig |
                                                                                                       Array<string> | IEntityDependencyConstructor>): (target: T) => T;
/**
 * Register a component - a reusable, isolated component with context.
 *
 * @param nameWithHtmlTemplateOrPath [component name, HTML template or path to an HTML template file]
 * @param componentBootstrapMetaData bootstrap metadata:
 * * CustomElementConstructor: Web Component element class extending HTMLElement
 * * string: path to a style template
 * * ITemplateProvider: a provider that returns the style template
 * * IComponentContextConfig: component context configuration
 * * Array<string>: adopted-style names
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the component or its child entities
 */
export function Component<T extends IComponentContextConstructor>(nameWithHtmlTemplateOrPath: [string, string],
                                                                  ...componentBootstrapMetaData: Array<CustomElementConstructor | string | ITemplateProvider | IComponentContextConfig |
                                                                                                       Array<string> | IEntityDependencyConstructor>): (target: T) => T;
/**
 * Register a component - a reusable, isolated component with context.
 *
 * @param nameWithHtmlTemplateProvider [component name, HTML template provider]
 * @param componentBootstrapMetaData bootstrap metadata:
 * * CustomElementConstructor: Web Component element class extending HTMLElement
 * * string: path to a style template
 * * ITemplateProvider: a provider that returns the style template
 * * IComponentContextConfig: component context configuration
 * * Array<string>: adopted-style names
 * * IEntityDependencyConstructor: dependencies (containers, components, aspects, transformers or injectables) used inside the component or its child entities
 */
export function Component<T extends IComponentContextConstructor>(nameWithHtmlTemplateProvider: [string, ITemplateProvider],
                                                                  ...componentBootstrapMetaData: Array<CustomElementConstructor | string | ITemplateProvider | IComponentContextConfig |
                                                                                                       Array<string> | IEntityDependencyConstructor>): (target: T) => T;
export function Component<T extends IComponentContextConstructor>(htmlTemplateOrPathOrProviderWithOrWithoutName: string | ITemplateProvider | [string, string | ITemplateProvider],
                                                                  ...componentBootstrapMetaData: Array<CustomElementConstructor | string | ITemplateProvider | IComponentContextConfig |
                                                                                                       Array<string> | IEntityDependencyConstructor>): (target: T) => T {
    return (target: T) => {
        let name: string | undefined;
        let elementContext: CustomElementConstructor | undefined;
        let htmlTemplateOrPathOrProvider: string | ITemplateProvider;
        let styleTemplateOrPathOrProvider: string | ITemplateProvider | undefined;
        let adoptedStyleNames: Array<string> | undefined;
        let contextConfig: IComponentContextConfig | undefined;

        if (Helpers.isArray(htmlTemplateOrPathOrProviderWithOrWithoutName)) {
            let [draftName, draftHtmlTemplateOrPathOrProvider] = <[string, string | ITemplateProvider]>htmlTemplateOrPathOrProviderWithOrWithoutName;
            if (!Helpers.isNotEmptyString(draftName) || 
                (!Helpers.isString(draftHtmlTemplateOrPathOrProvider) && 
                 (!Helpers.isObject(draftHtmlTemplateOrPathOrProvider) || 
                   (Helpers.isObject(draftHtmlTemplateOrPathOrProvider) && !isOfType(<object>draftHtmlTemplateOrPathOrProvider, TEMPLATE_PROVIDER_TEMPLATE))))) {
                Console.error(target, 'wrong component initialization meta data detected: there should be only 2 elements in configuration array: 1: container name, 2: html template or html template provider or html template url');
                return target;
            }

            name = draftName;
            htmlTemplateOrPathOrProvider = draftHtmlTemplateOrPathOrProvider;
        } else {
            htmlTemplateOrPathOrProvider = <string | ITemplateProvider>htmlTemplateOrPathOrProviderWithOrWithoutName;
        }

        if (Helpers.isUndefined(htmlTemplateOrPathOrProvider)) {
            Console.error(target, 'wrong component initialization meta data detected: html template not found.');
            return target;
        }

        for (const el of componentBootstrapMetaData) {
            if (Helpers.isString(el) || (Helpers.isObject(el) && isOfType(<object>el, TEMPLATE_PROVIDER_TEMPLATE))) {
                if (Helpers.isUndefined(styleTemplateOrPathOrProvider)) {
                    styleTemplateOrPathOrProvider = <string | ITemplateProvider>el;
                } else {
                    Console.error(target, 'wrong component initialization meta data detected: multiple style template or style template provider or style template url found.');
                    return target;
                }
            } else if (Helpers.isObject(el) && isOfType(<object>el, COMPONENT_CONTEXT_CONFIG_TEMPLATE)) {
                if (Helpers.isUndefined(contextConfig)) {
                    contextConfig = <IComponentContextConfig>el;
                } else {
                    Console.error(target, 'wrong component initialization meta data detected: multiple component context configs found.');
                    return target;
                }
            } else if (HTMLElement.isPrototypeOf(el)) {
                if (Helpers.isUndefined(elementContext)) {
                    elementContext = <CustomElementConstructor>el;
                } else {
                    Console.error(target, 'wrong component initialization meta data detected: multiple custom element constructors found.');
                    return target;
                }
            } else if (Helpers.isArray(el) && (<Array<any>>el).every(elem => Helpers.isNotEmptyString(elem))) {
                if (Helpers.isUndefined(adoptedStyleNames)) {
                    adoptedStyleNames = <Array<string>>el;
                } else {
                    Console.error(target, 'wrong component initialization meta data detected: multiple adopted styles arrays found.');
                    return target;
                }
            }
        }

        Environment.addComponent(name, target, getConstructorInjections(target),
                                 elementContext, htmlTemplateOrPathOrProvider!, styleTemplateOrPathOrProvider, adoptedStyleNames,
                                 contextConfig);

        return target;
    };
}

/**
 * Register an aspect - an element extender.
 *
 * @param styleTemplateOrPath style template or path to a style template file
 * @param aspectBootstrapMetaData bootstrap metadata:
 * * Array<string>: adopted-style names
 * * ((style: string) => string): style sanitizer
 */
export function Aspect<T extends IAspectContextConstructor>(styleTemplateOrPath?: string,
                                                            ...aspectBootstrapMetaData: Array<Array<string> | ((style: string) => string)>): (target: T) => T;
/**
 * Register an aspect - an element extender.
 *
 * @param styleTemplateProvider style template provider
 * @param aspectBootstrapMetaData bootstrap metadata:
 * * Array<string>: adopted-style names
 * * ((style: string) => string): style sanitizer
 */
export function Aspect<T extends IAspectContextConstructor>(styleTemplateProvider: ITemplateProvider,
                                                            ...aspectBootstrapMetaData: Array<Array<string> | ((style: string) => string)>): (target: T) => T;
/**
 * Register an aspect - an element extender.
 *
 * @param nameWithStyleTemplateOrPath [aspect name, style template or path to a style template file]
 * @param aspectBootstrapMetaData bootstrap metadata:
 * * Array<string>: adopted-style names
 * * ((style: string) => string): style sanitizer
 */
export function Aspect<T extends IAspectContextConstructor>(nameWithStyleTemplateOrPath: [string, string],
                                                            ...aspectBootstrapMetaData: Array<Array<string> | ((style: string) => string)>): (target: T) => T;
/**
 * Register an aspect - an element extender.
 *
 * @param nameWithStyleTemplateProvider [aspect name, style template provider]
 * @param aspectBootstrapMetaData bootstrap metadata:
 * * Array<string>: adopted-style names
 * * ((style: string) => string): style sanitizer
 */
export function Aspect<T extends IAspectContextConstructor>(nameWithStyleTemplateProvider: [string, ITemplateProvider],
                                                            ...aspectBootstrapMetaData: Array<Array<string> | ((style: string) => string)>): (target: T) => T;
export function Aspect<T extends IAspectContextConstructor>(styleTemplateOrPathOrProviderWithOrWithoutName?: string | ITemplateProvider | [string, string | ITemplateProvider],
                                                            ...aspectBootstrapMetaData: Array<Array<string> | ((style: string) => string)>): (target: T) => T {
    return (target: T) => {
        let name: string | undefined;
        let styleTemplateOrPathOrProvider: string | ITemplateProvider | undefined;
        let adoptedStyleNames: Array<string> | undefined;
        let styleSanitizer: ((style: string) => string) | undefined;

        if (!Helpers.isUndefined(styleTemplateOrPathOrProviderWithOrWithoutName)) {
            if (Helpers.isArray(styleTemplateOrPathOrProviderWithOrWithoutName)) {
                let [draftName, draftStyleTemplateOrPathOrProvider] = <[string, string | ITemplateProvider]>styleTemplateOrPathOrProviderWithOrWithoutName;
                if (!Helpers.isNotEmptyString(draftName) || 
                    (!Helpers.isString(draftStyleTemplateOrPathOrProvider) && 
                    (!Helpers.isObject(draftStyleTemplateOrPathOrProvider) || 
                    (Helpers.isObject(draftStyleTemplateOrPathOrProvider) && !isOfType(<object>draftStyleTemplateOrPathOrProvider, TEMPLATE_PROVIDER_TEMPLATE))))) {
                    Console.error(target, 'wrong aspect initialization meta data detected: there should be only 2 elements in configuration array: 1: aspect name, 2: style template or style template provider or style template url');
                    return target;
                }

                name = draftName;
                styleTemplateOrPathOrProvider = draftStyleTemplateOrPathOrProvider;
            } else {
                styleTemplateOrPathOrProvider = <string | ITemplateProvider>styleTemplateOrPathOrProviderWithOrWithoutName;
            }
        }

        for (const el of aspectBootstrapMetaData) {
            if (Helpers.isFunction(el)) {
                if (Helpers.isUndefined(styleSanitizer)) {
                    styleSanitizer = <(style: string) => string>el;
                } else {
                    Console.error(target, 'wrong aspect initialization meta data detected: multiple styleSanitizer functions found.');
                    return target;
                }
            } else if (Helpers.isArray(el)) {
                if (Helpers.isUndefined(adoptedStyleNames)) {
                    adoptedStyleNames = <Array<string>>el;
                } else {
                    Console.error(target, 'wrong aspect initialization meta data detected: multiple adopted styles arrays found.');
                    return target;
                }
            }
        }

        Environment.addAspect(name, target, getConstructorInjections(target), 
                             styleTemplateOrPathOrProvider, adoptedStyleNames, styleSanitizer);

        return target;
    };
}

/**
 * Register a transformer - an expression extender.
 *
 * @param name optional transformer name
 */
export function Transformer<T extends ITransformerContextConstructor>(name?: string): (target: T) => T {
    return (target: T) => {
        
        Environment.addTransformer(name, target, getConstructorInjections(target));

        return target;
    };
}

/**
 * Register a class for dependency injection.
 *
 * @param singleton true - the class is constructed only once; false - a new instance is constructed each time the class is requested
 */
export function Injectable<T extends IInjectableConstructor>(singleton: boolean = false): (target: T) => T {
    return (target: T) => {
        
        Environment.registerInjectable(target, getConstructorInjections(target), singleton);

        return target;
    };
}

/**
 * Mark a property as a change-detector property.
 * Only a simple, configurable property can be marked as a detector.
 * Changes to the property value trigger change detection.
 */
export function Detector<T extends IContext | IComponentContext>(): (targetPrototype: T, propName: string) => void {
    return (targetPrototype: T, propName: string) => {
        Environment.addDetector(<IContextConstructor | IComponentContextConstructor>targetPrototype, propName);
    };
}

/**
 * Mark a property as an eventer property.
 * Only a simple, configurable property can be marked as an eventer.
 * Changes to the property value dispatch a CustomEvent carrying the property value as `data`.
 *
 * @param name optional event name
 */
export function Eventer<T extends IContext | IComponentContext>(name?: string): (targetPrototype: T, propName: string) => void {
    return (targetPrototype: T, propName: string) => {
        Environment.addEventer(name, <IContextConstructor | IComponentContextConstructor>targetPrototype, propName);
    };
}

/**
 * Register a template for nb-template.
 *
 * @param name template name
 * @param htmlTemplateOrPathOrProvider HTML template, path to an HTML template file, or HTML template provider
 * @param htmlSanitizer HTML sanitizer
 * @returns template name
 */
export function $Template(name: string, htmlTemplateOrPathOrProvider: string | ITemplateProvider, htmlSanitizer?: (html: string) => string): string {
    if (!Helpers.isString(htmlTemplateOrPathOrProvider) && 
        (!Helpers.isObject(htmlTemplateOrPathOrProvider) || 
         (Helpers.isObject(htmlTemplateOrPathOrProvider) && !isOfType(<object>htmlTemplateOrPathOrProvider, TEMPLATE_PROVIDER_TEMPLATE)))) {
        Console.error(`Template with name '${name}' has wrong initialization meta data: htmlTemplateOrPathOrProvider should have html template or html template provider or html template url`);
        return name;
    }

    Environment.addTemplate(name, htmlTemplateOrPathOrProvider, htmlSanitizer);

    return name;
}

/**
 * Register an adopted style.
 *
 * @param name adopted-style name
 * @param styleTemplateOrPathOrProvider style template, path to a style template file, or style template provider
 * @param styleSanitizer style sanitizer
 * @returns adopted-style name
 */
export function $AdoptedStyle(name: string, styleTemplateOrPathOrProvider: string | ITemplateProvider, styleSanitizer?: (style: string) => string): string {
    if (!Helpers.isString(styleTemplateOrPathOrProvider) && 
        (!Helpers.isObject(styleTemplateOrPathOrProvider) || 
         (Helpers.isObject(styleTemplateOrPathOrProvider) && !isOfType(<object>styleTemplateOrPathOrProvider, TEMPLATE_PROVIDER_TEMPLATE)))) {
        Console.error(`Template with name '${name}' has wrong initialization meta data: styleTemplateOrPathOrProvider should have style template or style template provider or style template url`);
        return name;
    }

    Environment.addAdoptedStyle(name, styleTemplateOrPathOrProvider, styleSanitizer);

    return name;
}

/**
 * Register an external class for dependency injection.
 * Use this for application-external classes that cannot be registered with the @Injectable decorator.
 * For internal application classes use the @Injectable decorator.
 *
 * @param target external class
 * @returns external class
 */
export function $Injectable<T extends IInjectable>(target: T): IInjectable | IInjectableConstructor;

/**
 * Register an external class for dependency injection.
 * Use this for application-external classes that cannot be registered with the @Injectable decorator.
 * For internal application classes use the @Injectable decorator.
 *
 * @param target external class
 * @param singleton true - the external class is constructed only once; false - a new instance is constructed each time the class is requested
 * @returns external class
 */
export function $Injectable<T extends IInjectableConstructor>(target: T, singleton: boolean, ...dependencies: Array<IInjectableConstructor>): IInjectable | IInjectableConstructor;
export function $Injectable<T extends IInjectableConstructor | IInjectable>(target: T, singleton: boolean = false, ...dependencies: Array<IInjectableConstructor>): IInjectable | IInjectableConstructor {
    if (Helpers.isFunction(target)) {
        Environment.registerInjectable(<IInjectableConstructor>target, dependencies, singleton);
    } else {
        Environment.addInjectable(<IInjectable>target);
    }

    return target;
}

/**
 * Configure the global config.
 * Use this when the application has multiple @AppRoot entries.
 * Otherwise, provide the global config in @AppRoot.
 *
 * @param config global config
 */
export function $Config(config: IGlobalConfig): void {
    Environment.config(config);
}

/**
 * Configure routing.
 * Use this when the application has multiple @AppRoot entries.
 * Otherwise, provide the route config in @AppRoot.
 *
 * @param routeConfig route config
 */
export function $Route(routeConfig: string): void {
    Environment.setupRouter(routeConfig);
}

function isOfType(obj: {[key: string]: any}, templateObj: {[key: string]: any}): boolean {
    let result = false;

    if (obj !== null) {
        const objectKeys = Object.getOwnPropertyNames(obj);
        const expectedKeys = Object.getOwnPropertyNames(templateObj);

        if ((objectKeys.length > 0) && (objectKeys.length <= expectedKeys.length)) {
            result = true;

            for (const elem of objectKeys) {
                const keyIndex = expectedKeys.findIndex(element => element === elem);
                if ((keyIndex < 0) || ((keyIndex >= 0) && (typeof(obj[elem]) !== typeof(templateObj[elem])))) {
                    result = false;
                    break;
                } else if (Helpers.isObject(templateObj[elem])) {
                    result = isOfType(obj[elem], templateObj[elem]);
                    if (!result) {
                        break;
                    }
                }
            }
        }
    }

    return result;
}

function getConstructorInjections(target: object): Array<IInjectableConstructor> {
    const metaData = REFLECT.getMetadata('design:paramtypes', target);
    return Helpers.isArray(metaData) ? metaData : [];
}