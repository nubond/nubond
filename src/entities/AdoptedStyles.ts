import { TemplateEntity, BaseTemplateEntityMetaData } from './base/TemplateEntity';

import { ITemplateProvider } from '../interfaces/ITemplateProvider';

import { Constants } from '../Constants';
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
                 styleTemplateOrPathOrProvider: string | ITemplateProvider, 
                 styleSanitizerCreator: () => ((style: string) => string) | undefined,
                 getShowDebugInfo: () => boolean) {
        super();

        this.name = name;
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
                            try {
                                el(true);
                            } catch (ex) {
                                Console.error(el, `AdoptedStyle readyCallBack failed with exception: ${ex}`);
                            }
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
                        let errorMessage = `Invalid adopted style ${this.name}: `;

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
            Console.error(`Unable to get adopted style '${this.name}' style template in ${this.MAX_PREPARE_ATTEMPTS} attempts.`);
        }

        return result;
    }
}

export class AdoptedStyles extends TemplateEntity<TemplateEntityWithNameMetaData> {
    private readonly PROCESSING_HIDE_NAME_KEY = '%SYSTEM%:PROCESSING_HIDE_NAME_KEY';
    private readonly HIDE_NAME_KEY = '%SYSTEM%:HIDE_NAME_KEY'

    public get processingHideCSSStyleSheet(): CSSStyleSheet {
        return this.getInternal(this.PROCESSING_HIDE_NAME_KEY, true)!;
    }

    public get hideCSSStyleSheet(): CSSStyleSheet {
        return this.getInternal(this.HIDE_NAME_KEY, true)!;
    }

    constructor(private _getShowDebugInfo: () => boolean) {
        super();

        this.addInternal(this.PROCESSING_HIDE_NAME_KEY, Constants.DEFAULT_PROCESSING_HIDE_STYLE, () => undefined, true);
        this.addInternal(this.HIDE_NAME_KEY, Constants.DEFAULT_HIDE_STYLE, () => undefined, true);
    }

    public get(name: string): CSSStyleSheet | undefined {
        return this.getInternal(name, false);
    }

    public add(name: string,
               styleTemplateOrPathOrProvider: string | ITemplateProvider,
               styleSanitizerCreator: () => ((style: string) => string) | undefined): void {
        this.addInternal(name, styleTemplateOrPathOrProvider, styleSanitizerCreator, false);
    }

    private getInternal(rawName: string, isSystem: boolean): CSSStyleSheet | undefined {
        const name = isSystem ? rawName : rawName.toLowerCase();
        const templateMetaData = this.data.get(name);

        if (!Helpers.isUndefined(templateMetaData)) {
            if (templateMetaData!.isReady) {
                return templateMetaData!.cssStyleSheet;
            } else {
                Console.error(`AdoptedStyle '${rawName}' is not ready`);  
            }
        }
    }

    private addInternal(rawName: string,
                        styleTemplateOrPathOrProvider: string | ITemplateProvider,
                        styleSanitizerCreator: () => ((style: string) => string) | undefined,
                        isSystem: boolean): void {
        const name = isSystem ? rawName : rawName.toLowerCase();

        if (this.has(name)) {
            Console.error(`AdoptedStyle with '${rawName}' name already exists, adopted style name should be case-insensitive unique.`);
            return;
        }

        this.data.set(name, new TemplateEntityWithNameMetaData(rawName,
                                                               styleTemplateOrPathOrProvider, styleSanitizerCreator,
                                                               this._getShowDebugInfo));
    }
}