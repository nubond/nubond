import { BasedEntity } from './BasedEntity';

import { ITemplateProvider } from '../../interfaces/ITemplateProvider';

import { Helpers } from '../../Helpers';

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
        if (Helpers.isNotEmptyString(templatePath)) {
            fetch(templatePath!).then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    throw new Error(`${response.status} (${response.statusText})`);
                }
            }).then(template => {
                try {
                    if (Helpers.isNotEmptyString(template)) {
                        successCallBack(template);
                    } else {
                        errorCallBack(null);
                    }
                } catch {
                    //no need to rethrow
                }
            }, reason => {
                errorCallBack(reason);
            }).catch(error => errorCallBack(error));  
        } else if (Helpers.isObject(templateProvider) && Helpers.isFunction(templateProvider!.get)) {
            const providerResult = templateProvider!.get();
            if (Helpers.isNotEmptyString(providerResult)) {
                successCallBack(<string>providerResult);
            } else if (providerResult instanceof Promise) {
                (<Promise<any>>providerResult).then(template => {
                    if (Helpers.isNotEmptyString(template)) {
                        successCallBack(<string>template);
                    } else {
                        errorCallBack(null);
                    }
                });
            } else {
                errorCallBack(null);
            }
        } else {
            errorCallBack();
        }
    }

    public tryPrepare(readyCallBack: (asyncCallBack: boolean) => void): boolean {
        readyCallBack(false);
        return true;
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
            if (URL.canParse(htmlTemplateOrPath)) {
                this.htmlTemplatePath = htmlTemplateOrPath;
            } else {
                this.setHtmlTemplate(htmlTemplateOrPath);
            }
        }
    }

    public setHtmlTemplate(htmlTemplate: string): void {
        if (!this.isHTMLTemplateReady) {
            const newNode = document.createElement('template');
            const htmlSanitizer = this.htmlSanitizerCreator();
            newNode.innerHTML = Helpers.isFunction(htmlSanitizer) ? htmlSanitizer!(htmlTemplate) : htmlTemplate;
    
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