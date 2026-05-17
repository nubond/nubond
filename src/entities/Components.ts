import { IComponentContext, IComponentContextConstructor } from '../interfaces/contexts/IComponentContext';

import { ITemplateProvider } from '../interfaces/ITemplateProvider';
import { IInjectableConstructor } from '../interfaces/IInjectable'

import { IShadowRootConfig } from '../interfaces/IShadowRootConfig';

import { Injectables } from './Injectables';
import { AdoptedStyles } from './AdoptedStyles';

import { NElementProjection } from '../nElement/NElementProjection';

import { ContextBinder } from '../ContextBinder';

import { TemplateEntity, TemplateEntityMetaData } from './base/TemplateEntity';

import { Helpers } from '../Helpers';
import { Constants } from '../Constants';
import { Console } from '../Console';

class FullEntityWithComponentContextMetaData extends TemplateEntityMetaData {
    private readonly MAX_PREPARE_ATTEMPTS = 3;

    private readonly _getShowDebugInfo: () => boolean;

    private _readyCallBacks: Array<(asyncCallBack: boolean) => void> = [];

    private _fetchInProgress = false;
    private _prepareAttempts = 0;

    protected readonly styleSanitizerCreator: () => ((style: string) => string) | undefined;

    protected isStyleTemplateReady = false;

    public readonly context: IComponentContextConstructor;
    public readonly binderCreator: () => ContextBinder;

    public readonly name: string;
    
    public get isReady(): boolean {
        return this.isHTMLTemplateReady && this.isStyleTemplateReady;
    }

    private _styleTemplate: Node | undefined;
    public get styleTemplate(): Node | undefined {
        return this._styleTemplate;
    }

    public readonly styleTemplatePath: string | undefined;
    public readonly styleTemplateProvider: ITemplateProvider | undefined;

    constructor(name: string, context: IComponentContextConstructor,
                binderCreator: () => ContextBinder,
                styleTemplateOrPathOrProvider: string | ITemplateProvider | undefined, htmlTemplateOrPathOrProvider: string | ITemplateProvider,
                htmlSanitizerCreator: () => ((html: string) => string) | undefined, 
                styleSanitizerCreator: () => ((style: string) => string) | undefined,
                getShowDebugInfo: () => boolean) {
        super(htmlTemplateOrPathOrProvider, htmlSanitizerCreator);

        this.name = name;
        this.context = context;
        this.binderCreator = binderCreator;
        this.styleSanitizerCreator = styleSanitizerCreator;
        this._getShowDebugInfo = getShowDebugInfo;

        if (Helpers.isUndefined(styleTemplateOrPathOrProvider) ||
            (Helpers.isString(styleTemplateOrPathOrProvider) && ((<string>styleTemplateOrPathOrProvider).length == 0))) {
            this.isStyleTemplateReady = true;
        } else if (Helpers.isObject(styleTemplateOrPathOrProvider)) {
            this.styleTemplateProvider = <ITemplateProvider>styleTemplateOrPathOrProvider;
        } else {
            const stylesTemplateOrPath = <string>styleTemplateOrPathOrProvider;
            if (URL.canParse(stylesTemplateOrPath)) {
                this.styleTemplatePath = stylesTemplateOrPath;
            } else {
                this.setStyleTemplate(stylesTemplateOrPath);
            }
        }
    }

    public setStyleTemplate(styleTemplate: string): void {
        if (!this.isStyleTemplateReady) {
            const newNode = document.createElement('style');
            const styleSanitizer = this.styleSanitizerCreator();
            newNode.textContent = Helpers.isFunction(styleSanitizer) ? styleSanitizer!(styleTemplate) : styleTemplate;
    
            this._styleTemplate = newNode;
            this.isStyleTemplateReady = true;
        }
    }

    public tryPrepare(readyCallBack: (asyncCallBack: boolean) => void): boolean {
        let result = true;

        if (this.isReady) {
            readyCallBack(false);
        } else if (this._prepareAttempts < this.MAX_PREPARE_ATTEMPTS) {
            this._readyCallBacks.push(readyCallBack);

            if (!this._fetchInProgress) {
                this._fetchInProgress = true;
                this._prepareAttempts++;
                const triggerReadyCallBacks = () => {
                    //to unwrap error if any
                    setTimeout(() => {
                        for (const el of this._readyCallBacks) {
                            try {
                                el(true);
                            } catch (ex) {
                                Console.error(el, `Component readyCallBack failed with exception: ${ex}`);
                            }
                        }

                        this._readyCallBacks = [];
                        this._fetchInProgress = false;
                    });
                };

                if (!this.isHTMLTemplateReady) {
                    this.fetchData(this.htmlTemplatePath, this.htmlTemplateProvider, template => {
                        this.setHtmlTemplate(template); 

                        if (this.isReady) {
                            triggerReadyCallBacks();
                        }
                    }, error => {
                        let errorMessage = `Invalid component '${this.name}': `;

                        if (Helpers.isNotEmptyString(error)) {
                            errorMessage += `html response does not indicate success: ${error}.`;
                        } else if (error === null) {
                            errorMessage += 'provided html template data is not a string or this string is empty.';
                        } else {
                            errorMessage += 'nor html template, nor html template url, nor html template provider has been found.';
                        }

                        Console.error(errorMessage);
                        
                        if (this._getShowDebugInfo()) {
                            this.setHtmlTemplate(errorMessage);
                        }
                        
                        if (this.isReady) {
                            triggerReadyCallBacks();
                        }
                    });
                } else if (this.isReady) {
                    triggerReadyCallBacks();
                }

                if (!this.isStyleTemplateReady) {
                    this.fetchData(this.styleTemplatePath, this.styleTemplateProvider, template => {
                        this.setStyleTemplate(template!);

                        if (this.isReady) {
                            triggerReadyCallBacks();
                        }
                    }, error => {
                        let errorMessage = `Invalid component ${this.name}: `;

                        if (Helpers.isNotEmptyString(error)) {
                            errorMessage += `style response does not indicate success: ${error}.`;
                        } else if (error === null) {
                            errorMessage += 'provided style template data is not a string or this string is empty.';
                        } else {
                            errorMessage += 'nor style template, nor style template url, nor style template provider has been found.';
                        }

                        Console.error(errorMessage);
                        
                        if (this._getShowDebugInfo()) {
                            this.setStyleTemplate(errorMessage);
                        }

                        if (this.isReady) {
                            triggerReadyCallBacks();
                        }
                    });
                } else if (this.isReady) {
                    triggerReadyCallBacks();
                }
            }
        } else {
            result = false;
            Console.error(`Unable to get component '${this.name}' html and/or style template(s) in ${this.MAX_PREPARE_ATTEMPTS} attempts.`);    
        }

        return result;
    }
}

export class Components extends TemplateEntity<FullEntityWithComponentContextMetaData> {
    constructor(private _injectables: Injectables, private _adoptedStyles: AdoptedStyles, private _getShowDebugInfo: () => boolean) {
        super();
    }
    
    public instantiateBinder(name: string): ContextBinder | undefined {
        const lowerCasedName = name.toLowerCase();
        const containerMetaData = this.data.get(lowerCasedName);

        if (!Helpers.isUndefined(containerMetaData)) {
            return containerMetaData!.binderCreator();
        }
    }

    public instantiateContext(name: string, ...contextDependantInjections: Array<object>): IComponentContext | undefined {
        const lowerCasedName = name.toLowerCase();
        const containerMetaData = this.data.get(lowerCasedName);

        if (!Helpers.isUndefined(containerMetaData)) {
            return <IComponentContext>this._injectables.resolve(containerMetaData!.context, ...contextDependantInjections);
        }
    }

    public add(name: string, context: IComponentContextConstructor, dependencies: Array<IInjectableConstructor>,
               elementContext: CustomElementConstructor | undefined,  
               htmlTemplateOrPathOrProvider: string | ITemplateProvider, 
               stylesTemplateOrPathOrProvider: string | ITemplateProvider| undefined,
               adoptedStyleNames: Array<string> | undefined,
               binderCreator: () => ContextBinder, 
               htmlSanitizerCreator: () => ((html: string) => string) | undefined,
               styleSanitizerCreator: () => ((style: string) => string) | undefined,
               shadowRootConfigCreator: () => IShadowRootConfig | undefined): void {
        const lowerCasedName = name.toLowerCase();

        if (!Helpers.isValidCustomElementName(lowerCasedName)) {
            Console.error(`Component name ${lowerCasedName} is not valid custom element name.`);
            return;
        }

        if (this.has(lowerCasedName)) {
            Console.error(`Component with '${name}' name already exists, component name should be case-insensitive unique.`);
            return;
        }

        const componentMetaData = new FullEntityWithComponentContextMetaData(lowerCasedName, context,
                                                                             binderCreator,
                                                                             stylesTemplateOrPathOrProvider, htmlTemplateOrPathOrProvider,
                                                                             htmlSanitizerCreator, styleSanitizerCreator,
                                                                             this._getShowDebugInfo);
        this.data.set(lowerCasedName, componentMetaData);
        this._injectables.register(context, dependencies);

        const adoptedStyles = this._adoptedStyles;
        const componentShadowRootConfig = shadowRootConfigCreator();

        try {
            customElements.define(lowerCasedName, class extends (Helpers.isUndefined(elementContext) ? HTMLElement : elementContext!) {
                constructor() {
                    super();

                    this.setAttribute(Constants.DEFAULT_PREFIX + Constants.DEFAULT_SEPARATOR + Constants.COMPONENT_MARKER_ATTRIBUTE_NAME, '');
                    
                    Object.defineProperty(this, '$bind', {
                        value: (contextBinder: ContextBinder, context: IComponentContext, hasInputs: boolean = true) => {
                            delete (<any>this).$bind;
                            
                            componentMetaData.tryPrepare(() => {
                                const shadowRootConfig: ShadowRootInit = { mode: 'closed' };

                                if (Helpers.isObject(componentShadowRootConfig)) {
                                    if (Helpers.isBoolean(componentShadowRootConfig!.delegatesFocus)) {
                                        shadowRootConfig.delegatesFocus = componentShadowRootConfig!.delegatesFocus;
                                    }

                                    if ((componentShadowRootConfig!.mode === 'open') || (componentShadowRootConfig!.mode === 'closed')) {
                                        shadowRootConfig.mode = componentShadowRootConfig!.mode;
                                    }

                                    if (Helpers.isBoolean(componentShadowRootConfig!.serializable)) {
                                        shadowRootConfig.serializable = componentShadowRootConfig!.serializable;
                                    }
                                }

                                const shadowRoot = this.attachShadow(shadowRootConfig);
                                const nElementProjection = new NElementProjection(this, shadowRoot);

                                //style creation
                                //default
                                shadowRoot.adoptedStyleSheets = [adoptedStyles.processingHideCSSStyleSheet, adoptedStyles.hideCSSStyleSheet];

                                //components
                                if (Helpers.isArray(adoptedStyleNames) && (adoptedStyleNames!.length > 0)) {
                                    const filteredAdoptedStyleNames = adoptedStyleNames!.filter((el, index, self) => self.indexOf(el) === index);
                                    for (const el of filteredAdoptedStyleNames) {
                                        adoptedStyles.tryPrepare(el, asyncCallBack => {
                                            const cssStyleSheet = adoptedStyles.get(el);
                                            if (!Helpers.isUndefined(cssStyleSheet)) {
                                                shadowRoot.adoptedStyleSheets.push(cssStyleSheet!);
                                            }
                                        });
                                    }
                                }

                                if (!Helpers.isUndefined(componentMetaData.styleTemplate)) {
                                    const styles = document.createElement('style');
                                    styles.append(...Array.from(componentMetaData.styleTemplate!.cloneNode(true).childNodes));
                                    shadowRoot.append(styles);
                                }

                                //template creation
                                shadowRoot.append(...Array.from(componentMetaData.htmlTemplate!.content.cloneNode(true).childNodes));

                                //nElement creations
                                nElementProjection.process();

                                //bind
                                contextBinder.bind(shadowRoot, context, false, hasInputs);
                            });
                        },
                        configurable: true
                    });
                }
            });
        } catch (ex) {
            Console.error(`Component '${name}' registration error: ${ex}`);
        }
    }
}