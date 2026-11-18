import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';
import { IEventsBindings } from '../../interfaces/nElement/bindings/IEventsBindings';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IElementManipulationsConsumer } from '../../interfaces/nElement/IElementManipulationsConsumer';
import { IDisposable } from '../../interfaces/IDisposable'

import { IContextBinder } from '../../interfaces/contextBinders/IContextBinder';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExpressionExecParamsHelper, ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { ElementManipulations } from '../../models/injections/ElementManipulations';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class EventsBindings implements IEventsBindings {
    public readonly nExpression: IExpressionDetails;

    public readonly debounce: number | undefined;

    //debounced subscriptions only: the rest use the Events handler itself as the listener
    public unSubscribe: (() => void) | undefined;

    constructor(nExpression: IExpressionDetails, debounce: number | undefined) {
        this.nExpression = nExpression;
        this.debounce = debounce;
    }
}

export class Events extends Base implements IHandler<Map<string, IEventsBindings> | undefined>, IElementManipulationsConsumer, IDisposable, EventListenerObject {
    private _isFirstBind = true;

    private readonly _nativeElement: HTMLElement;

    private readonly _contextBinder: IContextBinder | undefined;
    private readonly _getElementManipulations: (() => ElementManipulations) | undefined;

    private _unsubscribed: Set<string> | undefined;
    private readonly _subscribed: Map<string, EventsBindings> | undefined;

    private _executionParams: ExecutionParams | undefined;

    public readonly hasElementManipulations: boolean;
    
    public nExpression: Map<string, EventsBindings> | undefined;
    public readonly hasNExpression: boolean;

    public readonly isDirty = false;

    constructor(nativeElement: Element, attributes: Attributes, 
                contextBinder: IContextBinder,
                getElementManipulations: () => ElementManipulations) {
        super();
        
        this._nativeElement = <HTMLElement>nativeElement;

        if (attributes.has(Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true, true)) {
            this.hasNExpression = true;
            this.nExpression = new Map<string, EventsBindings>();

            this._contextBinder = contextBinder;
            this._subscribed = new Map<string, EventsBindings>();

            const handlerNameWithMeta = Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME + Constants.META_VALUE_SEPARATOR;
            let hasElementManipulations = false;

            for (const [key, value] of attributes.getAll(Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME, true)) {
                const rawEventName = key.replace(handlerNameWithMeta, '');
                if (rawEventName.length > 0) {
                    if (!Helpers.isUndefined(value)) {
                        let eventName: string;
                        let debounce: number | undefined;
                        
                        const debounceDataStartIndex = rawEventName.lastIndexOf(Constants.META_VALUE_SEPARATOR);
                        if (debounceDataStartIndex > 0) {
                            const rawDebounce = parseInt(rawEventName.substring(debounceDataStartIndex + Constants.META_VALUE_SEPARATOR.length), 10);
                            if (Helpers.isNumber(rawDebounce) && !isNaN(rawDebounce)) {
                                eventName = rawEventName.substring(0, debounceDataStartIndex);
                                debounce = rawDebounce;
                            } else { //event name itself contains META_VALUE_SEPARATOR as a part of name
                                eventName = rawEventName;
                            }
                        } else {
                            eventName = rawEventName;
                        }

                        if (!this.nExpression.has(eventName)) {
                            const nExpression = ExpressionDetails.create(value!);
                            hasElementManipulations = hasElementManipulations || Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP.test(nExpression.expression);
                            this.nExpression.set(eventName, new EventsBindings(nExpression, debounce));
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

            this.hasElementManipulations = hasElementManipulations;

            if (this.hasElementManipulations) {
                this._getElementManipulations = getElementManipulations;
            }
        } else {
            this.hasNExpression = false;
            this.hasElementManipulations = false;
        }
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            this._executionParams = executionParams;

            if (this._isFirstBind) {
                this._isFirstBind = false;
                
                for (const [key, data] of this.nExpression!) {
                    this.handleSubscription(key, data);
                }

                this.nExpression = undefined;
            }
        }

        return executionParams;
    }
    
    public commit(): boolean {
        return false;
    }
    
    public dispose(): void {
        if (this.hasNExpression) {
            for (const [key, data] of this._subscribed!) {
                this.unSubscribe(key, data);
            }

            this._unsubscribed?.clear();
            this._subscribed!.clear();
        }
    }

    //EventListenerObject
    public handleEvent(evt: Event): void {
        const data = this._subscribed?.get(evt.type);
        if (!Helpers.isUndefined(data)) {
            this.handleEventExecution(evt.type, data!, evt);
        }
    }

    protected handleSubscription(key: string, data: EventsBindings) {
        if (!this._subscribed!.has(key) && !(this._unsubscribed?.has(key) ?? false)) {
            if (Helpers.isNumber(data.debounce)) {
                data.unSubscribe = Events.subscribe(this._nativeElement, key, (evt: Event) => this.handleEventExecution(key, data, evt), 
                                                    undefined, data.debounce);
            } else {
                this._nativeElement.addEventListener(key, this);
            }

            this._subscribed!.set(key, data);
        }
    }

    private unSubscribe(key: string, data: EventsBindings): void {
        if (Helpers.isFunction(data.unSubscribe)) {
            data.unSubscribe!();
        } else {
            this._nativeElement.removeEventListener(key, this);
        }
    }

    private handleEventExecution(key: string, data: EventsBindings, evt: Event): void {
        const unSubscribe = () => {
            if (!(this._unsubscribed?.has(key) ?? false) && (this._subscribed!.get(key) === data)) {
                this.unSubscribe(key, data);
                this._subscribed!.delete(key);

                if (Helpers.isUndefined(this._unsubscribed)) {
                    this._unsubscribed = new Set<string>();
                }

                this._unsubscribed!.add(key);
            }
        };

        const extendedExecParams = ExpressionExecParamsHelper.createOrExtendEventExecParams(this._nativeElement, 
                                                                                            this._getElementManipulations?.(), evt,
                                                                                            () => unSubscribe(), this._executionParams);
        const result = this._contextBinder!.expressionExecutor.executeExpression(data.nExpression.expression, 
                                                                                 this._contextBinder!.context!,
                                                                                 this._nativeElement,
                                                                                 extendedExecParams);

        if (result instanceof Promise) {
            result.then(() => {
                if (data.nExpression.isSingleBinded) {
                    unSubscribe();
                }                  
            }).catch(error => {
                Console.error(this._nativeElement, `${key} event promise error: ${error}`);
            }).finally(() => {
                this._contextBinder!.detectChanges();
            });
        } else {
            if (data.nExpression.isSingleBinded) {
                unSubscribe();
            }

            this._contextBinder!.detectChanges();
        }
    }

    public static subscribe<K extends keyof HTMLElementEventMap>(nativeElement: Element, eventName: K | string, callBack: (evt: HTMLElementEventMap[K] | Event) => any, 
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

        nativeElement.addEventListener(eventName, listener, options);
        
        return function (): void {
            if (Helpers.isNumber(debounceTimeout)) {
                clearTimeout(debounceTimeout);
                debounceTimeout = undefined;
            }

            nativeElement.removeEventListener(eventName, listener, options);
        };
    }
}