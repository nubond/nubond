import { IContext, IContextConstructor } from '../interfaces/contexts/IContext';

import { ITemplateProvider } from '../interfaces/ITemplateProvider';
import { IInjectableConstructor } from '../interfaces/IInjectable';

import { Injectables } from './Injectables';

import { ContextBinder } from '../ContextBinder';

import { TemplateEntity, TemplateEntityMetaData, TemplateEntityData } from './base/TemplateEntity';

import { Helpers } from '../Helpers';
import { Console } from '../Console';

export class TemplateEntityBinderData extends TemplateEntityData {
    public readonly contextBinder: ContextBinder;

    constructor(contextBinder: ContextBinder, template: Node) {
        super(template);
        this.contextBinder = contextBinder;
    }
}

class TemplateEntityWithContextMetaData extends TemplateEntityMetaData {
    private readonly MAX_PREPARE_ATTEMPTS = 3;

    private readonly _getShowDebugInfo: () => boolean;

    private _readyCallBacks: Array<(asyncCallBack: boolean) => void> = [];

    private _fetchInProgress = false;
    private _prepareAttempts = 0;

    public readonly name: string;
    public readonly context: IContextConstructor;
    public readonly binderCreator: () => ContextBinder;

    constructor (name: string, context: IContextConstructor, 
                 binderCreator: () => ContextBinder,
                 htmlTemplateOrPathOrProvider: string | ITemplateProvider, 
                 htmlSanitizerCreator: () => ((html: string) => string) | undefined,
                 getShowDebugInfo: () => boolean) {
        super(htmlTemplateOrPathOrProvider, htmlSanitizerCreator);

        this.name = name;
        this.context = context;
        this.binderCreator = binderCreator;
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
                            } catch (ex) {
                                Console.error(el, `Container readyCallBack failed with exception: ${ex}`);
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
                        let errorMessage = `Invalid container '${this.name}': `;

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
            Console.error(`Unable to get container '${this.name}' html template in ${this.MAX_PREPARE_ATTEMPTS} attempts.`);
        }

        return result;
    }
}

export class Containers extends TemplateEntity<TemplateEntityWithContextMetaData> {
    constructor(private _injectables: Injectables, private _getShowDebugInfo: () => boolean) {
        super();
    }

    public instantiateBinder(name: string): TemplateEntityBinderData | undefined {
        const lowerCasedName = name.toLowerCase();
        const containerMetaData = this.data.get(lowerCasedName);

        if (!Helpers.isUndefined(containerMetaData)) {
            if (containerMetaData!.isReady) {
                return new TemplateEntityBinderData(containerMetaData!.binderCreator(),
                                                    containerMetaData!.htmlTemplate!.content.cloneNode(true));
            } else {
                Console.error(`Container '${name}' is not ready`);    
            }
        }
    }

    public instantiateContext(name: string, ...contextDependantInjections: Array<object>): IContext | undefined {
        const lowerCasedName = name.toLowerCase();
        const containerMetaData = this.data.get(lowerCasedName);

        if (!Helpers.isUndefined(containerMetaData)) {
            if (containerMetaData!.isReady) {
                return <IContext>this._injectables.resolve(containerMetaData!.context, ...contextDependantInjections);
            } else {
                Console.error(`Container '${name}' is not ready`);    
            }
        }
    }

    public add(name: string, context: IContextConstructor, dependencies: Array<IInjectableConstructor>,
               htmlTemplateOrPathOrProvider: string | ITemplateProvider,
               binderCreator: () => ContextBinder, 
               htmlSanitizerCreator: () => ((html: string) => string) | undefined): void {
        const lowerCasedName = name.toLowerCase();

        if (this.has(lowerCasedName)) {
            Console.error(`Container with '${name}' name already exists, container name should be case-insensitive unique.`);
            return;
        }

        this.data.set(lowerCasedName, new TemplateEntityWithContextMetaData(name, context, binderCreator,
                                                                            htmlTemplateOrPathOrProvider, htmlSanitizerCreator,
                                                                            this._getShowDebugInfo));
        this._injectables.register(context, dependencies);
    }
}