import { TemplateEntity, TemplateEntityMetaData } from './base/TemplateEntity';

import { ITemplateProvider } from '../interfaces/ITemplateProvider';

import { Helpers } from '../Helpers';
import { Console } from '../Console';
import { Constants } from '../Constants';

class TemplateEntityWithNameMetaData extends TemplateEntityMetaData {
    private readonly MAX_PREPARE_ATTEMPTS = 3;

    private readonly _getShowDebugInfo: () => boolean;

    private _readyCallBacks: Array<(asyncCallBack: boolean) => void> = [];

    private _fetchInProgress = false;
    private _prepareAttempts = 0;

    public readonly name: string;

    constructor (name: string,
                 htmlTemplateOrPathOrProvider: string | ITemplateProvider, 
                 htmlSanitizerCreator: () => ((html: string) => string) | undefined,
                 getShowDebugInfo: () => boolean) {
        super(htmlTemplateOrPathOrProvider, htmlSanitizerCreator);

        this.name = name;
        this._getShowDebugInfo = getShowDebugInfo;
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
                            } catch(ex) {
                                Console.error(el, `Template readyCallBack failed with exception: ${ex}`);
                            }
                        }

                        this._readyCallBacks = [];
                        this._fetchInProgress = false;
                    });
                };
                
                if (!this.isHTMLTemplateReady) {
                    this.fetchData(this.htmlTemplatePath, this.htmlTemplateProvider, template => {
                        this.setHtmlTemplate(template!);
                        triggerReadyCallBacks();
                    }, error => {
                        let errorMessage = `Invalid template '${this.name}': `;

                        if (Helpers.isNotEmptyString(error)) {
                            errorMessage += `response does not indicate success: ${error}.`;
                        } else if (error === null) {
                            errorMessage += 'provided html template data is not a string or this string is empty.';
                        } else {
                            errorMessage += 'nor html template, nor html template url, nor html template provider has been found.';
                        }

                        Console.error(errorMessage);

                        if (this._getShowDebugInfo()) {
                            this.setHtmlTemplate(errorMessage);
                        }
                        
                        triggerReadyCallBacks();
                    });
                } else {
                    triggerReadyCallBacks();
                }
            }
        } else {
            result = false;
            Console.error(`${Constants.DISPLAY_NAME}: Unable to get template '${this.name}' html template in ${this.MAX_PREPARE_ATTEMPTS} attempts.`);
        }

        return result;
    }
}

export class Templates extends TemplateEntity<TemplateEntityWithNameMetaData> {
    constructor(private _getShowDebugInfo: () => boolean) {
        super();
    }

    public get(name: string): Node | undefined {
        const lowerCasedName = name.toLowerCase();
        const templateMetaData = this.data.get(lowerCasedName);

        if (!Helpers.isUndefined(templateMetaData)) {
            if (templateMetaData!.isReady) {
                
                return templateMetaData!.htmlTemplate!.content.cloneNode(true);
            } else {
                Console.error(`Template '${name}' is not ready`);  
            }
        }
    }

    public add(name: string,
               htmlTemplateOrPathOrProvider: string | ITemplateProvider,
               htmlSanitizerCreator: () => ((html: string) => string) | undefined): void {
        const lowerCasedName = name.toLowerCase();

        if (this.has(lowerCasedName)) {
            Console.error(`Template with '${name}' name already exists, template name should be case-insensitive unique.`);
            return;
        }

        this.data.set(lowerCasedName, new TemplateEntityWithNameMetaData(name,
                                                                         htmlTemplateOrPathOrProvider, htmlSanitizerCreator,
                                                                         this._getShowDebugInfo));
    }
}