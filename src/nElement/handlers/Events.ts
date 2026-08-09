import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';
import { IEventsBindings } from '../../interfaces/nElement/bindings/IEventsBindings';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { IDisposable } from '../../interfaces/IDisposable'

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExpressionExecParamsHelper, ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { ElementManipulations } from '../../models/injections/ElementManipulations';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class EventsBindings implements IEventsBindings {
    readonly nExpression: IExpressionDetails;

    debounce: number | undefined;

    constructor(nExpression: IExpressionDetails, debounce: number | undefined) {
        this.nExpression = nExpression;
        this.debounce = debounce;
    }
}

export class Events extends Base implements IHandler<Map<string, IEventsBindings>>, IDisposable {
    private _isFirstBind = true;

    private readonly _getElementManipulations: () => ElementManipulations;

    private readonly _nativeElement: HTMLElement;
    private readonly _requestDetectChanges: (() => void);

    private readonly _subscriptionData = new Map<string, () => void>();
    private readonly _unSubscribedData = new Set<string>();

    private previousExecutionParams: ExecutionParams | undefined;

    public readonly nExpression: Map<string, EventsBindings> | undefined;
    public readonly hasNExpression: boolean;
    
    public readonly isDirty = false;

    constructor(nativeElement: Element, attributes: Attributes, getElementManipulations: () => ElementManipulations,
                requestDetectChanges: () => void, getShowDebugInfo: () => boolean) {
        super();
        
        this._nativeElement = <HTMLElement>nativeElement;
        this._getElementManipulations = getElementManipulations;
        this._requestDetectChanges = requestDetectChanges;

        if (attributes.has(Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true, true)) {
            this.hasNExpression = true;
            this.nExpression = new Map<string, EventsBindings>();

            for (const [key, value] of attributes.getAll(Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true)) {
                const rawEventName = key.replace(Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME + Constants.META_VALUE_SEPARATOR, '');
                if (rawEventName.length > 0) {
                    if (!Helpers.isUndefined(value)) {
                        let eventName: string;
                        let debounce: number | undefined;
                        
                        const debounceDataStart = rawEventName.indexOf(Constants.META_VALUE_SEPARATOR);
                        if (debounceDataStart > 0) {
                            eventName = rawEventName.substring(0, debounceDataStart);

                            const rawDebounce = parseInt(rawEventName.substring(debounceDataStart + Constants.META_VALUE_SEPARATOR.length), 10);
                            if (Helpers.isNumber(rawDebounce) && !isNaN(rawDebounce)) {
                                debounce = rawDebounce;
                            } else {
                                if (getShowDebugInfo()) {
                                    Console.error(nativeElement, `'${eventName}' event has wrong debounce data (${rawDebounce}) and will not be debounced`);
                                }
                            }
                        } else {
                            eventName = rawEventName;
                        }

                        if (!this.nExpression.has(eventName)) {
                            this.nExpression.set(eventName, new EventsBindings(new ExpressionDetails(value!), debounce));
                        } else {
                            Console.error(nativeElement, `multiple handlers for one event (${eventName}) are not supported`);
                        }
                    } else {
                        Console.error(nativeElement, `event handler can't be empty`);
                    }
                } else {
                    Console.error(nativeElement, `event name can't be empty`);
                }
            }
        } else {
            this.hasNExpression = false;
        }
    }
    
    public subscribe<K extends keyof HTMLElementEventMap>(eventName: K | string, callBack: (evt: HTMLElementEventMap[K] | Event) => any, 
                                                          options?: boolean | AddEventListenerOptions, debounce?: number): () => void {
        let debounceTimeout: number | undefined;
        const listener = !Helpers.isNumber(debounce) 
                                ? callBack
                                : (evt: Event) => {
                                    if (Helpers.isNumber(debounceTimeout)) {
                                        clearTimeout(debounceTimeout);
                                        debounceTimeout = undefined;
                                    }
                                    debounceTimeout = setTimeout(() => callBack(evt), debounce);
                                };

        this._nativeElement.addEventListener(eventName, listener, options);
        
        const that = this;
        return function (): void {
            if (Helpers.isNumber(debounceTimeout)) {
                clearTimeout(debounceTimeout);
                debounceTimeout = undefined;
            }

            that._nativeElement.removeEventListener(eventName, listener, options);
        };
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            let handleSubscription = false;

            if (this._isFirstBind) {
                this._isFirstBind = false;
                handleSubscription = true;
            } else if (!Helpers.equals(this.previousExecutionParams, executionParams)) {
                handleSubscription = true;

                for (const [key, data] of this.nExpression!) {
                    if (!this._unSubscribedData.has(key)) {
                        const unsubscribeFn = this._subscriptionData.get(key);
                        if (Helpers.isFunction(unsubscribeFn)) {
                            unsubscribeFn!();
                            this._unSubscribedData.delete(key);
                            this._subscriptionData.delete(key)
                        }
                    }
                }
            }
            
            if (handleSubscription) {
                this.previousExecutionParams = executionParams;

                for (const [key, data] of this.nExpression!) {
                    this.handleSubscription(key, data, executionParams, executeExpression);
                }
            }
        }

        return executionParams;
    }
    
    public commit(): boolean {
        return false;
    }
    
    public dispose(): void {
        for (const [key, unsubscribeFn] of this._subscriptionData) {
            if (Helpers.isFunction(unsubscribeFn)) {
                unsubscribeFn!();
            }
        }

        this._unSubscribedData.clear();
        this._subscriptionData.clear();
    }

    private handleSubscription<K extends keyof HTMLElementEventMap>(key: K | string, data: IEventsBindings, executionParams: ExecutionParams | undefined, 
                                                                    executeExpression: (expression: string | null | undefined,
                                                                    executionParams: ExecutionParams | undefined) => any) {
        if (!this._subscriptionData.has(key)) { 
            const nativeUnSubscribe = this.subscribe(key, (evt: Event) => {
                const unSubscribe = (permanent?: boolean) => {
                    if (!this._unSubscribedData.has(key)) {
                        nativeUnSubscribe();

                        if (Helpers.isBoolean(permanent) && permanent) {
                            this._unSubscribedData.add(key);
                        }
                    }
                };

                const extendedExecParams = ExpressionExecParamsHelper.createOrExtendEventExecParams(this._nativeElement, 
                                                                                                    this._getElementManipulations(), evt,
                                                                                                    () => unSubscribe(true), executionParams);
                const result = executeExpression(data.nExpression.expression, extendedExecParams);

                if (result instanceof Promise) {
                    result.then(() => {
                        if (data.nExpression.isSingleBinded) {
                            unSubscribe(true);
                        }                  
                    }).finally(() => {
                        this._requestDetectChanges();
                    });
                } else {
                    if (data.nExpression.isSingleBinded) {
                        unSubscribe(true);
                    }

                    this._requestDetectChanges();
                }
            }, undefined, data.debounce);

            this._subscriptionData.set(key, nativeUnSubscribe);
        }
    }
}