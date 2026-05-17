import { TemplateEntity, BaseTemplateEntityMetaData } from './base/TemplateEntity'; 

import { ITemplateProvider } from '../interfaces/ITemplateProvider';
import { IInjectableConstructor } from '../interfaces/IInjectable';

import { IAspectContext, IAspectContextConstructor } from '../interfaces/contexts/IAspectContext'; 

import { Injectables } from './Injectables';

import { Helpers } from '../Helpers';
import { Console } from '../Console';

class TemplateEntityWithNameMetaData extends BaseTemplateEntityMetaData {
    private readonly MAX_PREPARE_ATTEMPTS = 3;

    private readonly _getShowDebugInfo: () => boolean;

    private _readyCallBacks: Array<(asyncCallBack: boolean) => void> = [];

    private _fetchInProgress = false;
    private _prepareAttempts = 0;

    protected readonly styleSanitizerCreator: () => ((style: string) => string) | undefined;
    protected isStyleTemplateReady = false;

    public readonly name: string;
    public readonly aspect: IAspectContextConstructor;
    public readonly hasStyles: boolean;
    public readonly adoptedStyleNames: Array<string> | undefined;

    public get isReady(): boolean {
        return this.isStyleTemplateReady;
    }

    private _cssStyleSheet: CSSStyleSheet | undefined;
    public get cssStyleSheet(): CSSStyleSheet | undefined {
        return this._cssStyleSheet;
    }

    public readonly styleTemplatePath: string | undefined;
    public readonly styleTemplateProvider: ITemplateProvider | undefined;

    constructor (name: string, 
                 aspect: IAspectContextConstructor,
                 styleTemplateOrPathOrProvider: string | ITemplateProvider | undefined,
                 adoptedStyleNames: Array<string> | undefined,
                 styleSanitizerCreator: () => ((style: string) => string) | undefined,
                 getShowDebugInfo: () => boolean) {
        super();

        this.name = name;
        this.aspect = aspect;
        this.styleSanitizerCreator = styleSanitizerCreator;
        this._getShowDebugInfo = getShowDebugInfo;

        if (Helpers.isArray(adoptedStyleNames) && (adoptedStyleNames!.length > 0)) {
            this.adoptedStyleNames = adoptedStyleNames!.filter((el, index, self) => self.indexOf(el) === index);
        }

        let hasOwnStyles = false;

        if (Helpers.isUndefined(styleTemplateOrPathOrProvider) ||
            (Helpers.isString(styleTemplateOrPathOrProvider) && ((<string>styleTemplateOrPathOrProvider).length == 0))) {
            this.isStyleTemplateReady = true;
        } else if (Helpers.isObject(styleTemplateOrPathOrProvider)) {
            this.styleTemplateProvider = <ITemplateProvider>styleTemplateOrPathOrProvider;
            hasOwnStyles = true;
        } else {
            const stylesTemplateOrPath = <string>styleTemplateOrPathOrProvider;
            if (URL.canParse(stylesTemplateOrPath)) {
                this.styleTemplatePath = stylesTemplateOrPath;
            } else {
                this.setStyleTemplate(stylesTemplateOrPath);
            }

            hasOwnStyles = true;
        }

        this.hasStyles = hasOwnStyles || (Helpers.isArray(this.adoptedStyleNames) && (this.adoptedStyleNames!.length > 0));
    }

    public setStyleTemplate(styleTemplate: string): void {
        if (!this.isStyleTemplateReady) {
            const cssStyleSheet = new CSSStyleSheet();
            const styleSanitizer = this.styleSanitizerCreator();
            cssStyleSheet.replaceSync(Helpers.isFunction(styleSanitizer) ? styleSanitizer!(styleTemplate) : styleTemplate);
    
            this._cssStyleSheet = cssStyleSheet;
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
                            el(true);
                        }

                        this._readyCallBacks = [];
                        this._fetchInProgress = false;
                    });
                };
                
                if (!this.isStyleTemplateReady) {
                    this.fetchData(this.styleTemplatePath, this.styleTemplateProvider, template => {
                        this.setStyleTemplate(template!);

                        if (this.isReady) {
                            triggerReadyCallBacks();
                        }
                    }, error => {
                        let errorMessage = `Invalid aspect ${this.name}: `;

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
                } else {
                    triggerReadyCallBacks();
                }
            }
        } else {
            result = false;
            Console.error(`Unable to get aspect '${this.name}' style template in ${this.MAX_PREPARE_ATTEMPTS} attempts.`);
        }

        return result;
    }
}

export class Aspects extends TemplateEntity<TemplateEntityWithNameMetaData> {
    constructor(private _injectables: Injectables, private _getShowDebugInfo: () => boolean) {
        super();
    }

    public instantiate(name: string, ...contextDependantInjections: Array<object>): [IAspectContext, boolean] | undefined {
        const lowerCasedName = name.toLowerCase();
        const aspectMetaData = this.data.get(lowerCasedName);

        if (!Helpers.isUndefined(aspectMetaData)) {
            const aspect = <IAspectContext | undefined>this._injectables.resolve(aspectMetaData!.aspect, ...contextDependantInjections);
            if (!Helpers.isUndefined(aspect)) {
                return [aspect!, aspectMetaData!.hasStyles];
            } 
        }
    }

    public getStyles(name: string): [CSSStyleSheet | undefined, Array<string> | undefined] | undefined {
        const lowerCasedName = name.toLowerCase();
        const aspectMetaData = this.data.get(lowerCasedName);

        if (!Helpers.isUndefined(aspectMetaData)) {
            if (aspectMetaData!.isReady) {
                return [aspectMetaData!.cssStyleSheet, aspectMetaData!.adoptedStyleNames];
            } else {
                 Console.error(`Aspect '${name}' is not ready`);    
            }
        }
    }
    
    public add(name: string, aspect: IAspectContextConstructor, dependencies: Array<IInjectableConstructor>, 
               styleTemplateOrPathOrProvider: string | ITemplateProvider | undefined, adoptedStyleNames: Array<string> | undefined,
               styleSanitizerCreator: () => ((style: string) => string) | undefined): void {
        const lowerCasedName = name.toLowerCase();

        if (this.has(lowerCasedName)) {
            Console.error(`Aspect with '${name}' name already exists, aspect name should be case-insensitive unique.`);
            return;
        }

        this.data.set(lowerCasedName, new TemplateEntityWithNameMetaData(name, aspect,
                                                                         styleTemplateOrPathOrProvider, adoptedStyleNames,
                                                                         styleSanitizerCreator,
                                                                         this._getShowDebugInfo));
        this._injectables.register(aspect, dependencies);
    }
}