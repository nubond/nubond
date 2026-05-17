import { IContext, IContextConstructor } from './interfaces/contexts/IContext';
import { IComponentContextConstructor } from './interfaces/contexts/IComponentContext';
import { IAspectContextConstructor } from './interfaces/contexts/IAspectContext';
import { ITransformerContextConstructor } from './interfaces/contexts/ITransformerContext';
import { IInjectableConstructor, IInjectable } from './interfaces/IInjectable';

import { IShadowRootConfig } from './interfaces/IShadowRootConfig';

import { Router } from './Router';

import { IGlobalConfig } from './interfaces/IGlobalConfig';
import { IContextConfig } from './interfaces/contexts/configs/IContextConfig';
import { IComponentContextConfig } from './interfaces/contexts/configs/IComponentContextConfig';

import { ITemplateProvider } from './interfaces/ITemplateProvider';

import { RootContextBinder, ContextBinder } from './ContextBinder';

import { Components } from './entities/Components';
import { Containers } from './entities/Containers';
import { Aspects } from './entities/Aspects';
import { Transformers } from './entities/Transformers';
import { Injectables } from './entities/Injectables';
import { Templates } from './entities/Templates';
import { Detectors } from './entities/Detectors';
import { Eventers } from './entities/Eventers';
import { AdoptedStyles } from './entities/AdoptedStyles';

import { ChangeDetector } from './models/injections/ChangeDetector';
import { EventDispatcher } from './models/injections/EventDispatcher';

import { Constants } from './Constants';

import { Helpers } from './Helpers';
import { Console } from './Console';

export class Environment {
    private static _showDebugInfo: boolean = false;
    private static _pessimisticChangeDetectionStrategy: boolean = false;
    private static _shadowRootConfig: IShadowRootConfig | undefined;
    private static _htmlSanitizer: ((html: string) => string) | undefined;
    private static _styleSanitizer: ((style: string) => string) | undefined;

    private static _elementsToContextsMapping = new Map<Element, RootContextBinder>;

    //router
    private static _router: Router | undefined;
    public static get router(): Router | undefined {
        return this._router;
    }

    //properties
    private static readonly _detectors = new Detectors();
    public static get detectors(): Detectors {
        return this._detectors;
    }

    private static readonly _eventers = new Eventers();
    public static get eventers(): Eventers {
        return this._eventers;
    }


    //classes 
    private static readonly _injectables = new Injectables();
    public static get injectables(): Injectables {
        return this._injectables;
    }

    private static readonly _aspects = new Aspects(this.injectables, () => this._showDebugInfo!);
    public static get aspects(): Aspects {
        return this._aspects;
    }

    private static readonly _transformers = new Transformers(this.injectables);
    public static get transformers(): Transformers {
        return this._transformers;
    }

    private static readonly _templates = new Templates(() => this._showDebugInfo!);
    public static get templates(): Templates {
        return this._templates;
    }

    private static readonly _adoptedStyles = new AdoptedStyles(() => this._showDebugInfo!);
    public static get adoptedStyles(): AdoptedStyles {
        return this._adoptedStyles;
    }
    
    private static readonly _containers = new Containers(this.injectables, () => this._showDebugInfo!);
    public static get containers(): Containers {
        return this._containers;
    }

    private static readonly _components = new Components(this.injectables, this.adoptedStyles, () => this._showDebugInfo!);
    public static get components(): Components {
        return this._components;
    }

    private constructor() { }
    
    public static addApp(selectorOrElement: string | Element | null | undefined, context: IContextConstructor, dependencies: Array<IInjectableConstructor>,
                          contextConfig: IContextConfig | undefined): void {
        //bootstrap preparation
        let element: Element;
        
        if (Helpers.isString(selectorOrElement)) {
            const selectedElement = document.querySelector(<string>selectorOrElement);

            if (selectedElement === null) {
                Console.error(`Element with selector '${selectorOrElement}' not found`);
                return;
            }
            
            element = selectedElement;
        } else {
            element = (Helpers.isUndefined(selectorOrElement)) || (selectorOrElement === null)
                                ? document.body
                                : <Element>selectorOrElement;
        }

        if (this._elementsToContextsMapping.has(element)) {
            Console.error(`Attempt to create multiple ${Constants.DISPLAY_NAME} applications binded to the same element found. ${Constants.DISPLAY_NAME} application cannot be created.`);
            return;
        }

        //root bootstrap
        const rootContextBinder = new RootContextBinder(contextConfig, this._pessimisticChangeDetectionStrategy,
                                                        () => Constants.DEFAULT_HIDE_CLASS_NAME, this._htmlSanitizer,
                                                        () => this._showDebugInfo!,
                                                        (obj: object) => this._detectors.get(<ObjectConstructor>obj.constructor),
                                                        (obj: object) => this._eventers.get(<ObjectConstructor>obj.constructor));

        this._elementsToContextsMapping.set(element, rootContextBinder);
        const unRegister = this._injectables.register(context, dependencies, true);

        rootContextBinder.onDispose(() => {
            this._elementsToContextsMapping.delete(element);
            unRegister();
        });

        rootContextBinder.bind(element, <IContext>this._injectables.resolve(context, new ChangeDetector(() => rootContextBinder!.detectChanges()),
                                                                            new EventDispatcher(element)), true);
    }

    public static addContainer(name: string | undefined, context: IContextConstructor, dependencies: Array<IInjectableConstructor>,
                               htmlTemplateOrPathOrProvider: string | ITemplateProvider,
                               contextConfig: IContextConfig | undefined): void {
        this._containers.add(Helpers.isNotEmptyString(name) ? name! : context.name,
                             context, dependencies,
                             htmlTemplateOrPathOrProvider,
                             () => new ContextBinder(contextConfig, this._pessimisticChangeDetectionStrategy,
                                                     () => Constants.DEFAULT_HIDE_CLASS_NAME, this._htmlSanitizer,
                                                     () => this._showDebugInfo!,
                                                     (obj: object) => this._detectors.get(<ObjectConstructor>obj.constructor),
                                                     (obj: object) => this._eventers.get(<ObjectConstructor>obj.constructor)),
                             () => Helpers.isFunction(contextConfig?.htmlSanitizer) 
                                     ? html => contextConfig!.htmlSanitizer!(html) 
                                     : (Helpers.isFunction(this._htmlSanitizer)
                                             ? html => this._htmlSanitizer!(html)
                                             : undefined));
    }

    public static addComponent(name: string | undefined, context: IComponentContextConstructor, dependencies: Array<IInjectableConstructor>,
                               elementContext: CustomElementConstructor | undefined,
                               htmlTemplateOrPathOrProvider: string | ITemplateProvider,
                               styleTemplateOrPathOrProvider: string | ITemplateProvider | undefined,
                               adoptedStyleNames: Array<string> | undefined,
                               contextConfig: IComponentContextConfig | undefined): void {
        this._components.add(Helpers.isNotEmptyString(name)
                                    ? (name!.indexOf('-') > 0
                                                ? name!
                                                : Helpers.fromCamelToKebabCase(Helpers.toCamelCase(name!)))
                                    : Helpers.fromCamelToKebabCase(Helpers.toCamelCase(context.name)),
                             context, dependencies,
                             elementContext,                                                                                            
                             htmlTemplateOrPathOrProvider, styleTemplateOrPathOrProvider, adoptedStyleNames,
                             () => new ContextBinder(contextConfig, this._pessimisticChangeDetectionStrategy,
                                                     () => Constants.DEFAULT_HIDE_CLASS_NAME, this._htmlSanitizer,
                                                     () => this._showDebugInfo!,
                                                     (obj: object) => this._detectors.get(<ObjectConstructor>obj.constructor),
                                                     (obj: object) => this._eventers.get(<ObjectConstructor>obj.constructor)),
                             () => Helpers.isFunction(contextConfig?.htmlSanitizer) 
                                     ? html => contextConfig!.htmlSanitizer!(html) 
                                     : (Helpers.isFunction(this._htmlSanitizer)
                                             ? html => this._htmlSanitizer!(html)
                                             : undefined), 
                             () => Helpers.isFunction(contextConfig?.styleSanitizer) 
                                         ? style => contextConfig!.styleSanitizer!(style) 
                                         : (Helpers.isFunction(this._styleSanitizer)
                                                 ? style => this._styleSanitizer!(style)
                                                 : undefined),
                             () => Helpers.isObject(contextConfig?.shadowRootConfig)
                                         ? contextConfig!.shadowRootConfig
                                         : this._shadowRootConfig);
    }

    public static addAspect(name: string | undefined, context: IAspectContextConstructor, dependencies: Array<IInjectableConstructor>, 
                            styleTemplateOrPathOrProvider: string | ITemplateProvider | undefined, adoptedStyleNames: Array<string> | undefined,
                            styleSanitizer: ((style: string) => string) | undefined): void {
        this._aspects.add(Helpers.isNotEmptyString(name)
                                ? (name!.indexOf('-') > 0
                                            ? name!
                                            : Helpers.fromCamelToKebabCase(Helpers.toCamelCase(name!)))
                                : Helpers.fromCamelToKebabCase(Helpers.toCamelCase(context.name)), 
                          context, dependencies,
                          styleTemplateOrPathOrProvider, adoptedStyleNames,
                          () => Helpers.isFunction(styleSanitizer) 
                                    ? style => styleSanitizer!(style) 
                                    : (Helpers.isFunction(this._styleSanitizer)
                                            ? style => this._styleSanitizer!(style)
                                            : undefined));
    }

    public static addTransformer(name: string | undefined, context: ITransformerContextConstructor, dependencies: Array<IInjectableConstructor>): void {
        this._transformers.add(Helpers.toCamelCase(Helpers.isNotEmptyString(name) ? name! : context.name), context, dependencies);
    }

    public static registerInjectable(injectable: IInjectableConstructor, dependencies: Array<IInjectableConstructor>,
                                     singleton: boolean): void {
        this._injectables.register(injectable, dependencies, singleton);
    }

    public static addInjectable(injectable: IInjectable): void {
        this._injectables.add(injectable);
    }

    public static addTemplate(name: string, htmlTemplateOrPathOrProvider: string | ITemplateProvider,
                              htmlSanitizer: ((html: string) => string) | undefined): void {
        this._templates.add(name, htmlTemplateOrPathOrProvider, () => Helpers.isFunction(htmlSanitizer) 
                                                                         ? html => htmlSanitizer!(html) 
                                                                         : (Helpers.isFunction(this._htmlSanitizer)
                                                                                 ? html => this._htmlSanitizer!(html)
                                                                                 : undefined));
    }

    public static addAdoptedStyle(name: string, styleTemplateOrPathOrProvider: string | ITemplateProvider,
                                  styleSanitizer: ((style: string) => string) | undefined): void {
        this._adoptedStyles.add(name, styleTemplateOrPathOrProvider, () => Helpers.isFunction(styleSanitizer) 
                                                                         ? style => styleSanitizer!(style) 
                                                                         : (Helpers.isFunction(this._styleSanitizer)
                                                                                 ? style => this._styleSanitizer!(style)
                                                                                 : undefined));
    }

    public static addDetector(targetPrototype: Object, propName: string): void {
        this._detectors.add(targetPrototype, propName);
    }

    public static addEventer(name: string | undefined, targetPrototype: Object, propName: string): void {
        this._eventers.add(targetPrototype,
                           Helpers.isNotEmptyString(name)
                                    ? (name!.indexOf('-') > 0
                                                ? name!
                                                : Helpers.fromCamelToKebabCase(Helpers.toCamelCase(name!)))
                                    : Helpers.fromCamelToKebabCase(Helpers.toCamelCase(propName)),
                           propName);
    }

    public static setupRouter(routeConfig: string | undefined): void {
        if (Helpers.isUndefined(this._router)) {
            this._router = new Router(routeConfig, containerName => this._containers.has(containerName), () => this._showDebugInfo!);
            this._injectables.add(this._router);
        } else {
            if (Helpers.isNotEmptyString(routeConfig)) {
                Console.error('Router is already initialized, configuration cannot be changed in runtime.');
            }
        }
    }

    public static config(config: IGlobalConfig): void {
        if (this._elementsToContextsMapping.size > 0) {
            Console.error(`Can't change global config during runtime. Consider apply configuration before app initialization.`);
            return;
        }

        //properties
        if (Helpers.isBoolean(config.showDebugInfo)) {
            this._showDebugInfo = config.showDebugInfo!;
        }

        if (Helpers.isBoolean(config.complyWithW3C)) {
            Constants.changeCompliancyWithW3C(config.complyWithW3C!);
        }
        
        if (Helpers.isBoolean(config.pessimisticChangeDetectionStrategy)) {
            this._pessimisticChangeDetectionStrategy = config.pessimisticChangeDetectionStrategy!;
        }

        if (Helpers.isObject(config.shadowRootConfig)) {
            try {
                this._shadowRootConfig = structuredClone(config.shadowRootConfig);
            } catch(ex) {
                Console.error(`Can't setup shadowRootConfig, error: ${ex}`);
            }
        }

        //functions
        if (Helpers.isFunction(config.htmlSanitizer)) {
            this._htmlSanitizer = config.htmlSanitizer;
        }

        if (Helpers.isFunction(config.styleSanitizer)) {
            this._styleSanitizer = config.styleSanitizer;
        }
    }
}