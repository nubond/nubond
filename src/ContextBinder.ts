import { IDisposable } from './interfaces/IDisposable';

import { IContextConfig } from './interfaces/contexts/configs/IContextConfig';
import { INElement, INTreeElement } from './interfaces/nElement/INElement';

import { IContext } from './interfaces/contexts/IContext';
import { IComponentContext } from './interfaces/contexts/IComponentContext';

import { ExpressionExecutor } from './expression/ExpressionExecutor';
import { CallBackEvent } from './CallBackEvent';

import { TreeBuilder } from './TreeBuilder';

import { Helpers } from './Helpers';
import { Console } from './Console';

export interface IContextBinder extends IDisposable {
    readonly isChangeDetectionEnabled: boolean;
    readonly context: IContext | IComponentContext | undefined;

    enableChangeDetection(): void;
    disableChangeDetection(): void;
    
    detectChanges(): void;
    inputsRefreshIsDone(): void;

    onDispose(onDisposeCallBack: () => void): () => void;
}

export class ContextBinder implements IContextBinder {
    private readonly MAX_CHANGE_DETECTION_CYCLES = 10; 

    private readonly _getDetectors: (obj: object) => Array<string> | undefined;
    private readonly _getEventers: (obj: object) => Map<string, string> | undefined

    private readonly _onContainerAttachedCallBackEvent = new CallBackEvent<(context: IContext) => void>();
    private readonly _onContainerDetachedCallBackEvent = new CallBackEvent<(context: IContext) => void>();
    private readonly _onInputsRefreshDoneCallBackEvent = new CallBackEvent<() => void>();
    private readonly _onDetectChangesDoneCallBackEvent = new CallBackEvent<() => void>();
    private readonly _onDisposeCallBackEvent = new CallBackEvent<() => void>();

    private readonly _pessimisticChangeDetectionStrategy: boolean;

    private _detectChangesTimeout: number | undefined;

    private _detectorsValueContainer: Map<string, any> | undefined;
    private _eventersValueContainer: Map<string, any> | undefined;

    private _isDisposed = false;
    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    private _isChangeDetectionEnabled = true;
    public get isChangeDetectionEnabled(): boolean {
        return this._isChangeDetectionEnabled;
    }

    private _rootNElement: INElement | INTreeElement | undefined;
    public get rootNElement(): INElement | INTreeElement | undefined {
        return this._rootNElement;
    }

    private _context: IContext | IComponentContext | undefined;
    public get context(): IContext | IComponentContext | undefined {
        return this._context;
    }
    public readonly getShowDebugInfo: () => boolean;
    public readonly getHiddenClassName: () => string;
    public readonly htmlSanitizer: ((html: string) => string) | undefined;
    public readonly expressionExecutor: ExpressionExecutor;
    
    constructor(contextConfig: IContextConfig | undefined,
                pessimisticChangeDetectionStrategyDefault: boolean,
                getHiddenClassName: () => string, htmlSanitizer: ((html: string) => string) | undefined,
                getShowDebugInfo: () => boolean,
                getDetectors: (obj: object) => Array<string> | undefined,
                getEventers: (obj: object) => Map<string, string> | undefined) {
        this.getShowDebugInfo = getShowDebugInfo;
        this.getHiddenClassName = getHiddenClassName;
        this._getDetectors = getDetectors;
        this._getEventers = getEventers;

        if (!Helpers.isUndefined(contextConfig)) {
            this.htmlSanitizer = Helpers.isFunction(contextConfig!.htmlSanitizer) 
                                        ? html => contextConfig!.htmlSanitizer!(html)
                                        : (Helpers.isFunction(htmlSanitizer)
                                                ? html => htmlSanitizer!(html)
                                                : undefined);

            if (!Helpers.isUndefined(contextConfig!.pessimisticChangeDetectionStrategy)) {
                this._pessimisticChangeDetectionStrategy = contextConfig!.pessimisticChangeDetectionStrategy!;
            } else {
                this._pessimisticChangeDetectionStrategy = pessimisticChangeDetectionStrategyDefault;
            }
        } else {
            this._pessimisticChangeDetectionStrategy = pessimisticChangeDetectionStrategyDefault;
        }

        this.expressionExecutor = new ExpressionExecutor(this.getShowDebugInfo);
    }

    public bind(element: Element | ShadowRoot, context: IContext | IComponentContext, elementBindable: boolean, debounced: boolean = true): void {
        this.bindInternal(element, context, elementBindable, debounced);
    }

    public detectChanges(): void {
        this.detectChangesInternal();
    }

    public enableChangeDetection(): void {
        this._isChangeDetectionEnabled = true;
    }

    public disableChangeDetection(): void {
        this._isChangeDetectionEnabled = false;
    }

    public dispose(): void {
        if (!this._isDisposed) {
            this._isDisposed = true;
            
            if (Helpers.isNumber(this._detectChangesTimeout)) {
                clearTimeout(this._detectChangesTimeout!);
                delete this._detectChangesTimeout;
            }

            this._rootNElement!.dispose();
            
            try {
                this._onDisposeCallBackEvent.raise();
            } catch(ex) {
                Console.error(this._rootNElement, `onDispose call back execution error: ${ex}`);
            }

            delete this._rootNElement;
            delete this._context;
            delete this._detectorsValueContainer;
            delete this._eventersValueContainer;
        }
    }

    //subscription to callback events
    protected onContainerAttached(callBack: (context: object) => void): () => void {
        return this._onContainerAttachedCallBackEvent.subscribe(callBack);
    }

    protected onContainerDetached(callBack: (context: object) => void): () => void {
        return this._onContainerDetachedCallBackEvent.subscribe(callBack);
    }

    protected onDetectChangesDone(callBack: () => void): () => void {
        return this._onDetectChangesDoneCallBackEvent.subscribe(callBack);
    }

    protected onInputsRefreshDone(callBack: () => void): () => void {
        return this._onInputsRefreshDoneCallBackEvent.subscribe(callBack);
    }

    public onDispose(callBack: () => void): () => void {
        return this._onDisposeCallBackEvent.subscribe(callBack);
    }

    //trigger callback events
    public containerAttached(context: object): void {
        try {
            this._onContainerAttachedCallBackEvent.raise(context);
        } catch(ex) {
             Console.error(this._rootNElement, `onContainerAttached call back execution error: ${ex}`);
        }
    }

    public containerDetached(context: object): void {
        try {
            this._onContainerDetachedCallBackEvent.raise(context);
        } catch(ex) {
             Console.error(this._rootNElement, `onContainerDetached call back execution error: ${ex}`);
        }
    }

    public inputsRefreshIsDone(): void {
        try {
            this._onInputsRefreshDoneCallBackEvent.raise();
        } catch(ex) {
            Console.error(this._rootNElement, `onInputsRefreshDone call back execution error: ${ex}`);
        }
    }

    protected changeDetectionIsDone(): void {
        if (!this.isDisposed) {
            try {
                this._onDetectChangesDoneCallBackEvent.raise();
            } catch(ex) {
                Console.error(this._rootNElement, `onDetectChangesDone call back execution error: ${ex}`);
            }
        }
    }

    protected bindInternal(element: Element | ShadowRoot, context: IContext | IComponentContext, elementBindable: boolean, debounced: boolean): void {
        if (Helpers.isUndefined(this._context)) {
            if (Helpers.isUndefined(this._rootNElement)) {
                this._rootNElement = TreeBuilder.constructTree(this, element, elementBindable);
                this._context = context;

                const detectors = this._getDetectors(context);
                if (Helpers.isArray(detectors) && (detectors!.length > 0)) {
                    this._detectorsValueContainer = new Map<string, any>();
                    this.getSetifyFromArray(this._context, this._detectorsValueContainer!, detectors!, false, () => this.detectChanges());
                }

                const eventers = this._getEventers(context);
                if (!Helpers.isUndefined(eventers) && (eventers!.size > 0)) {
                    this._eventersValueContainer = new Map<string, any>();
                    this.getSetifyFromMap(this._context, this._eventersValueContainer!, eventers!, true, (eventName: string, newValue: any) => {
                        this._rootNElement!.nativeElement.dispatchEvent(new CustomEvent(eventName, Helpers.isUndefined(newValue) ? newValue : { detail: newValue }));
                    });
                }

                //add event subscriptions
                if (Helpers.isFunction(context.onContainerAttached)) {
                    this.onContainerAttached(context.onContainerAttached!.bind(context));
                }

                if (Helpers.isFunction(context.onContainerDetached)) {
                    this.onContainerDetached(context.onContainerDetached!.bind(context));
                }

                if (Helpers.isFunction(context.onInputsRefreshDone)) {
                    this.onInputsRefreshDone(context.onInputsRefreshDone!.bind(context));
                }

                if (Helpers.isFunction(context.onDetectChangesDone)) {
                    this.onDetectChangesDone(context.onDetectChangesDone!.bind(context));
                }

                if (Helpers.isFunction(context.onDispose)) {
                    this.onDispose(context.onDispose!.bind(context));
                }

                if (debounced) {
                    this.detectChangesInternal();
                } else {
                    this.processChangeDetection();
                    this.changeDetectionIsDone();
                }
            } else {
                Console.error(element, 'invalid operation: context is already binded');
            }
        } else {
            Console.error(context, 'invalid operation: context is already set');
        }
    }

    protected detectChangesInternal(): void {
        if (!this.isDisposed && !Helpers.isUndefined(this._context) && this._isChangeDetectionEnabled) {
            if (Helpers.isNumber(this._detectChangesTimeout)) {
                clearTimeout(this._detectChangesTimeout!);
                this._detectChangesTimeout = undefined;
            }

            this._detectChangesTimeout = setTimeout(() => {
                if (!this.isDisposed) {
                    this.processChangeDetection();
                    this.changeDetectionIsDone();
                }
            });
        }
    }

    protected processChangeDetection(cycle: number = 0) {
        if (!this.isDisposed) {
            this._rootNElement!.detectChanges(this._context!);

            if (!this.isDisposed && this._pessimisticChangeDetectionStrategy) {
                if (!this._rootNElement!.isStable) {
                    if (cycle < this.MAX_CHANGE_DETECTION_CYCLES) {
                        this.processChangeDetection(cycle + 1);
                    } else {
                        Console.error(`tree can't stabilize in ${this.MAX_CHANGE_DETECTION_CYCLES} change detection cycles`);
                    }
                }
            }
        }
    }

    private getSetifyFromArray(context: {[key: string]: any}, valueContainer: Map<string, any>, properties: Array<string>, 
                               autoTrigger: boolean, action: (newValue: any) => void): void {
        for (const propertyName of properties) {
            try {
                const descriptor = Object.getOwnPropertyDescriptor(context, propertyName);

                if (!Helpers.isUndefined(descriptor)) {
                    if (Helpers.isFunction(descriptor!.get) || Helpers.isFunction(descriptor!.set)) {
                        Console.error(context, `invalid operation: property '${propertyName}' has getter or setter or both, such properties cannot be decorated. Only a simple configurable property can be decorated.`);
                        continue;
                    } else if (!descriptor!.configurable) {
                        Console.error(context, `invalid operation: property '${propertyName}' should be configurable and cannot be decorated. Only a simple configurable property can be decorated.`);
                        continue;
                    }
                }

                const propertyValue = context[propertyName];

                valueContainer.set(propertyName, propertyValue);
                delete context[propertyName];

                Object.defineProperty(context, propertyName, {
                    get: function () {
                        return valueContainer.get(propertyName);
                    }, 
                    set: function (newValue: any) {
                        const currentValue = valueContainer.get(propertyName);
                        valueContainer.set(propertyName, newValue);

                        if (!Helpers.equals(currentValue, newValue)) {
                            action(newValue);
                        }
                    },
                    enumerable: true
                });

                if (autoTrigger && !Helpers.isUndefined(propertyValue)) {
                    action(propertyValue);
                }
            } catch(ex) {
                Console.error(context, `invalid operation: property '${propertyName}' cannot be decorated. Only a simple configurable property can be decorated. Error: ${ex}.`);
            }
        }
    }

    private getSetifyFromMap(context: {[key: string]: any}, valueContainer: Map<string, any>, properties: Map<string, any>, 
                             autoTrigger: boolean, action: (metaData: any, newValue: any) => void): void {
        for (const [propertyName, metaData] of properties) {
            try {
                const descriptor = Object.getOwnPropertyDescriptor(context, propertyName);

                if (!Helpers.isUndefined(descriptor)) {
                    if (Helpers.isFunction(descriptor!.get) || Helpers.isFunction(descriptor!.set)) {
                        Console.error(context, `invalid operation: property '${propertyName}' has getter or setter or both, such properties cannot be decorated. Only a simple configurable property can be decorated.`);
                        continue;
                    } else if (!descriptor!.configurable) {
                        Console.error(context, `invalid operation: property '${propertyName}' should be configurable and cannot be decorated. Only a simple configurable property can be decorated.`);
                        continue;
                    }
                }

                const propertyValue = context[propertyName];

                valueContainer.set(propertyName, propertyValue);
                delete context[propertyName];

                Object.defineProperty(context, propertyName, {
                    get: function () {
                        return valueContainer.get(propertyName);
                    }, 
                    set: function (newValue: any) {
                        const currentValue = valueContainer.get(propertyName);
                        valueContainer.set(propertyName, newValue);

                        if (!Helpers.equals(currentValue, newValue)) {
                            action(metaData, newValue);
                        }
                    },
                    enumerable: true
                });

                if (autoTrigger && !Helpers.isUndefined(propertyValue)) {
                    action(metaData, propertyValue);
                }
            } catch(ex) {
                Console.error(context, `invalid operation: property '${propertyName}' cannot be decorated. Only a simple configurable property can be decorated. Error: ${ex}.`);
            }
        }
    }
}

export class RootContextBinder extends ContextBinder {
    private _disposableRoot = false;

    constructor(contextConfig: IContextConfig | undefined,
                pessimisticChangeDetectionStrategyDefault: boolean,
                getHiddenClassName: () => string, htmlSanitizer: ((html: string) => string) | undefined,
                getShowDebugInfo: () => boolean,
                getDetectors: (obj: object) => Array<string> | undefined,
                getEventers: (obj: object) => Map<string, string> | undefined) {
        super(contextConfig, pessimisticChangeDetectionStrategyDefault,
              getHiddenClassName, htmlSanitizer, getShowDebugInfo,
              getDetectors, getEventers);
    }

    public bind(element: Element | ShadowRoot, context: IContext | IComponentContext, elementBindable: boolean): void {
        this._disposableRoot = element !== document.body;
        this.bindInternal(element, context, elementBindable, false);
    }

    public detectChanges(): void {
        if (!this.isDisposed) {
            if (this._disposableRoot && !this.rootNElement!.nativeElement.isConnected) {
                this.dispose();
            } else {
                this.detectChangesInternal();
            }
        }
    }
}