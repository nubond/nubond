import { BasedEntity } from './BasedEntity';

import { ITemplateProvider } from '../../interfaces/ITemplateProvider';

import { Helpers } from '../../Helpers';
import { Console } from '../../Console';

export class TemplateEntityData {
    public readonly template: Node;

    constructor(template: Node) {
        this.template = template;
    }
}

export abstract class BaseTemplateEntityMetaData { 
    public abstract isReady: boolean;

    public fetchData(templatePath: string | undefined, templateProvider: ITemplateProvider | undefined,
                     successCallBack: (template: string) => void, errorCallBack: (error?: string | null) => void): void {
        const safeErrorCallBack = (error?: string | null) => {
            try {
                errorCallBack(error);
            } catch (ex) {
                Console.error(`fetchData errorCallBack failed${Helpers.isNotEmptyString(templatePath) ? ` for template '${templatePath}' ` : ' '}with exception: ${ex}`);
            }
        };

        if (Helpers.isNotEmptyString(templatePath)) {
            fetch(templatePath!).then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    throw new Error(`${response.status} (${response.statusText})`);
                }
            }).then(template => {
                if (Helpers.isNotEmptyString(template)) {
                    try {
                        successCallBack(template);
                    } catch(ex) {
                        safeErrorCallBack(`fetchData successCallBack for template '${templatePath}' failed with exception: ${ex}`);
                    }
                } else {
                    safeErrorCallBack(null);
                }
            }, reason => {
                safeErrorCallBack(this.normalizeError(reason));
            }).catch(error => {
                safeErrorCallBack(this.normalizeError(error));
            }); 
        } else if (Helpers.isObject(templateProvider) && Helpers.isFunction(templateProvider!.get)) {
            let providerResult;

            try {
                providerResult = templateProvider!.get();
            } catch (ex) {
                safeErrorCallBack(`fetchData templateProvider.get() failed with exception: ${ex}`);
                return;
            }

            if (Helpers.isNotEmptyString(providerResult)) {
                try {
                    successCallBack(<string>providerResult);
                } catch(ex) {
                    safeErrorCallBack(`fetchData successCallBack failed with exception: ${ex}`);
                }
            } else if (providerResult instanceof Promise) {
                (<Promise<any>>providerResult).then(template => {
                    if (Helpers.isNotEmptyString(template)) {
                        try {
                            successCallBack(<string>template);
                        } catch(ex) {
                            safeErrorCallBack(`fetchData successCallBack failed with exception: ${ex}`);
                        }
                    } else {
                        safeErrorCallBack(null);
                    }
                }).catch(error => {
                    safeErrorCallBack(this.normalizeError(error));
                });
            } else {
                safeErrorCallBack(null);
            }
        } else {
            safeErrorCallBack();
        }
    }

    public tryPrepare(readyCallBack: (asyncCallBack: boolean) => void): boolean {
        readyCallBack(false);
        return true;
    }

    public isUrlLikeAndNotContent(value: string): boolean {
        if (Helpers.isNotEmptyString(value)) {
            const trimmedValue = value.trim();
            if (trimmedValue.length > 0) {
                return trimmedValue.startsWith('/') && (trimmedValue.indexOf('\n') < 0) &&
                       (trimmedValue.indexOf('{') < 0) && (trimmedValue.indexOf('<') < 0);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    private normalizeError(error: unknown): string {
        return Helpers.isNotEmptyString(error)
                    ? <string>error
                    : (Helpers.isString(error) || Helpers.isUndefined(error) || (error === null)
                        ? 'unknown error'
                        : (error instanceof Error
                            ? `${error}`
                            : String(error)));
    } 
}

export class TemplateEntityMetaData extends BaseTemplateEntityMetaData {
    protected readonly htmlSanitizerCreator: () => ((html: string) => string) | undefined;

    protected isHTMLTemplateReady = false;

    public get isReady(): boolean {
        return this.isHTMLTemplateReady;
    }

    private _htmlTemplate: HTMLTemplateElement | undefined;
    public get htmlTemplate(): HTMLTemplateElement | undefined {
        return this._htmlTemplate;
    }

    public readonly htmlTemplatePath: string | undefined;
    public readonly htmlTemplateProvider: ITemplateProvider | undefined;

    constructor(htmlTemplateOrPathOrProvider: string | ITemplateProvider, htmlSanitizerCreator: () => ((html: string) => string) | undefined) {
        super();
        
        this.htmlSanitizerCreator = htmlSanitizerCreator;

        if (Helpers.isObject(htmlTemplateOrPathOrProvider)) {
            this.htmlTemplateProvider = <ITemplateProvider>htmlTemplateOrPathOrProvider;
        } else {
            const htmlTemplateOrPath = <string>htmlTemplateOrPathOrProvider;
            if (this.isUrlLikeAndNotContent(htmlTemplateOrPath)) {
                this.htmlTemplatePath = htmlTemplateOrPath;
            } else {
                this.setHtmlTemplate(htmlTemplateOrPath, false, true);
            }
        }
    }

    public setHtmlTemplate(htmlTemplate: string, override: boolean = false, skipSanitizer: boolean = false): void {
        if (!this.isHTMLTemplateReady || (override === true)) {
            const htmlSanitizer = this.htmlSanitizerCreator();
            
            const newNode = document.createElement('template');
            newNode.innerHTML = Helpers.isFunction(htmlSanitizer) && (skipSanitizer !== true) ? htmlSanitizer!(htmlTemplate) : htmlTemplate;

            this._htmlTemplate = newNode;
            this.isHTMLTemplateReady = true;
        }
    }
}

export class TemplateEntity<T extends BaseTemplateEntityMetaData> extends BasedEntity<T> {
    public isReady(name: string): boolean | undefined {
        return this.data.get(name.toLowerCase())?.isReady;
    }

    public tryPrepare(name: string, readyCallBack: (asyncCallBack: boolean) => void): boolean {
        const metaData = this.data.get(name.toLowerCase());
        return !Helpers.isUndefined(metaData) && metaData!.tryPrepare(readyCallBack);
    }
}