import { IExpressionDetails } from '../../../interfaces/expression/IExpressionDetails';
import { IContextInExpressionDetails } from '../../../interfaces/nElement/bindings/IContextBaseBindings';
import { IContextBaseBindings } from '../../../interfaces/nElement/bindings/IContextBaseBindings';

import { IHandler } from '../../../interfaces/nElement/IHandler';

import { IDisposable } from '../../../interfaces/IDisposable'

import { InitializableBase } from './InitializableBase';

import { IContextBinder } from '../../../ContextBinder';

import { Attributes } from '../Attributes';

import { ExpressionDetails } from '../../../expression/ExpressionDetails';
import { ExecutionParams } from '../../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../../Helpers';
import { Constants } from '../../../Constants';
import { Console } from '../../../Console';

export class ContextInExpressionDetails implements IContextInExpressionDetails {
    public readonly nExpression: IExpressionDetails;
    public readonly ref: boolean;

    constructor(nExpression: IExpressionDetails, ref: boolean) {
        this.nExpression = nExpression;
        this.ref = ref;
    }
}

export class ContextBaseBindings implements IContextBaseBindings {
    public readonly nExpression: IExpressionDetails;
    public readonly nInExpression: Map<string, IContextInExpressionDetails> | undefined;

    public readonly hasNInExpression: boolean;

    constructor (nExpression: IExpressionDetails, nInExpression?: Map<string, IContextInExpressionDetails>) {
        this.nExpression = nExpression;
        this.nInExpression = nInExpression;
        this.hasNInExpression = !Helpers.isUndefined(nInExpression);
    }
}

export abstract class ContextedBase<T> extends InitializableBase implements IHandler<IContextBaseBindings>, IDisposable {
    private _isFirstCommit = true;

    private _executionParams: ExecutionParams | undefined;
    private _executeExpression: ((expression: string | null | undefined, executionParams: ExecutionParams | undefined) => any) | undefined;

    protected readonly isElementVisible: (() => boolean) | undefined;
    protected readonly notifyContextAttached: ((context: object) => void) | undefined;
    protected readonly notifyContextDetached: ((context: object) => void) | undefined;

    protected contextBinder: IContextBinder | undefined;

    protected contextInputValues: Map<string, any> | undefined;
    protected contextInputsWithChangedValue: Set<string> | undefined;
    
    private _previousEntityData: T | undefined;
    protected get previousEntityData(): T | undefined {
        return this._previousEntityData;
    }

    private _currentEntityData: T | null | undefined;
    protected get currentEntityData(): T | null | undefined {
        return this._currentEntityData;
    }

    private _isInputsDirty = false;

    private _isVisibleDirty = false;
    private _previousIsVisible = true;
    private _isVisible = true;
    protected get isVisible(): boolean {
        return this._isVisible;
    }
    protected set isVisible(isVisible: boolean) {
        this._isVisible = isVisible;
        this._isVisibleDirty = true;
    }

    private _isEntityDataDirty = false;
    protected get isEntityDataDirty(): boolean {
        return this._isEntityDataDirty;
    }
    protected set isEntityDataDirty(isEntityDataDirty: boolean) {
        this._isEntityDataDirty = isEntityDataDirty;
    }

    public readonly nExpression: IContextBaseBindings | undefined;
    public readonly hasNExpression: boolean; 

    public get isDirty(): boolean {
        return this._isEntityDataDirty || this._isVisibleDirty || this._isInputsDirty;
    }

    constructor(expression: string | undefined, nativeElement: Element, attributes: Attributes,
                handlerAttributeName: string,
                isElementVisible: () => boolean,
                notifyContextAttached?: (context: object) => void,
                notifyContextDetached?: (context: object) => void) {
        super(nativeElement, handlerAttributeName);
        
        if (Helpers.isString(expression)) {
            this.isElementVisible = isElementVisible;
            this.notifyContextAttached = notifyContextAttached;
            this.notifyContextDetached = notifyContextDetached;

            this.hasNExpression = true;

            const expressionDetails = new ExpressionDetails(expression!);

            if (attributes.has(Constants.IN_HANDLER_ATTRIBUTE_NAME, true, true) || attributes.has(Constants.IN_REF_HANDLER_ATTRIBUTE_NAME, true, true)) {
                const nInExpression = new Map<string, IContextInExpressionDetails>();
                this.nExpression = new ContextBaseBindings(expressionDetails, nInExpression);

                for (const handlerName of [Constants.IN_HANDLER_ATTRIBUTE_NAME, Constants.IN_REF_HANDLER_ATTRIBUTE_NAME]) {
                    for (const [key, value] of attributes.getAll(handlerName, true)) {
                        const propertyName = key.replace(handlerName + Constants.META_VALUE_SEPARATOR, '');
                        if (propertyName.length > 0) {
                            if (!Helpers.isUndefined(value)) {
                                const normalizedHandlerName = Helpers.fromKebabToCamelCase(propertyName);
                                if (!nInExpression.has(normalizedHandlerName)) {
                                    nInExpression.set(normalizedHandlerName,
                                                      new ContextInExpressionDetails(new ExpressionDetails(value!), 
                                                                                     handlerName == Constants.IN_REF_HANDLER_ATTRIBUTE_NAME));  
                                } else {
                                    Console.error(nativeElement, `multiple handlers for one in (${normalizedHandlerName}) are not supported`);
                                }
                            } else {
                                Console.error(nativeElement, `${handlerName} handler can't be empty`);
                            }  
                        } else {
                            Console.error(nativeElement, `${handlerName} name can't be empty`);
                        }
                    }
                }
            } else {
                this.nExpression = new ContextBaseBindings(expressionDetails);
            }
        } else {
            this.hasNExpression = false;
        }
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            let currentExecutionParams = executionParams;

            this.isVisible = this.isElementVisible!();

            currentExecutionParams = this.onBind(currentExecutionParams, executeExpression);

            if (this.nExpression!.hasNInExpression) {
                this._executionParams = executionParams;
                this._executeExpression = executeExpression;

                if (!Helpers.isUndefined(this.contextBinder) && this.isVisible) {
                    currentExecutionParams = this.bindInputs(currentExecutionParams, executeExpression);
                }
            }

            return currentExecutionParams;
        } else {
            return executionParams;
        }
    }

    public commit(): boolean {
        let wasDirty = false;

        if (this._isEntityDataDirty && this._isVisible) {
            this._currentEntityData = this.onCommit(this._currentEntityData);

            if (!Helpers.isUndefined(this._currentEntityData)) {           
                if (this._previousEntityData !== this._currentEntityData) {
                    if (this._isFirstCommit) {
                        this._isFirstCommit = false;
                    } else {                       
                        this.disposeProtected(false);
                    }

                    if (this._currentEntityData != null) {
                        this.contextBinder = this.onEntityDataChange(this._currentEntityData);

                        if (this.nExpression!.hasNInExpression) {
                            this.contextInputValues = new Map<string, any>();
                            this.contextInputsWithChangedValue = new Set<string>();

                            this.prepareInputs();
                            this.bindInputs(this._executionParams!, this._executeExpression!);
                        }

                        if (Helpers.isFunction(this.notifyContextAttached)) {
                            this.notifyContextAttached!(this.contextBinder!.context!);
                        }

                        this._previousEntityData = this._currentEntityData;
                        wasDirty = true;
                    }
                }
            } else {
                if (this._previousEntityData !== this._currentEntityData) {
                    this.disposeProtected(true);
                    wasDirty = true;
                }
            }
            
            this._isEntityDataDirty = false;
        }

        if (this._isVisibleDirty) {
            if (this._previousIsVisible !== this._isVisible) {
                if (Helpers.isObject(this.contextBinder)) {
                    if (this._isVisible) {
                        this.contextBinder!.enableChangeDetection();
                    } else {
                        this.contextBinder!.disableChangeDetection();
                    }
                }

                this._previousIsVisible = this._isVisible;
                wasDirty = true;
            }

            this._isVisibleDirty = false;
        }

        if (this._isInputsDirty) {
            if (Helpers.isObject(this.contextBinder)) {
                for (const name of this.contextInputsWithChangedValue!) {
                    try {
                        (<{[key: string]: any}>this.contextBinder!.context)[name] = this.contextInputValues!.get(name);
                    } catch(ex) {
                        Console.error(this.nativeElement, `${name} input set error: ${ex}`);
                    }
                }

                this.contextInputsWithChangedValue!.clear();

                this.contextBinder!.inputsRefreshIsDone();
                this.contextBinder!.detectChanges();

                wasDirty = true;
            } else {
                if (!Helpers.isUndefined(this.contextInputsWithChangedValue)) {
                    this.contextInputsWithChangedValue!.clear();
                    wasDirty = true;
                }
            }

            this._isInputsDirty = false;
        }

        return wasDirty;
    }

    public dispose(): void {
        if (this.hasNExpression) {
            this.disposeProtected(true);
            this.onDispose();
        }
    }

    public onBind(executionParams: ExecutionParams | undefined,
                  executeExpression: (expression: string | null | undefined, 
                                      executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        return executionParams;
    }

    protected abstract onCommit(entityData: T | null | undefined): T | null | undefined;
    protected abstract onEntityDataChange(entityData: T): IContextBinder;

    protected onDispose(): void {
    }

    protected prepareInputs(): void {
        for (const [key, value] of this.nExpression!.nInExpression!) {
            this.resetExpressionExecutionState(value.nExpression, `${Constants.IN_HANDLER_ATTRIBUTE_NAME}:${key}`);
        }
    }

    protected bindInputs(executionParams: ExecutionParams | undefined, executeExpression: (expression: string | null | undefined, 
                                                                                           executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        for (const [key, value] of this.nExpression!.nInExpression!) {
            this.processExpressionExecution(value.nExpression, `${Constants.IN_HANDLER_ATTRIBUTE_NAME}:${key}`,
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.setInputValue!(key, data, value.ref));
        }

        return executionParams;
    }

    protected setInputValue(name: string, value: any, ref: boolean): void {
        let oldValue = undefined;
        if (this.contextInputValues!.has(name)) {
            oldValue = this.contextInputValues!.get(name);
        } else {
            const contextValue = (<{[key: string]: any}>this.contextBinder!.context)[name];
            if (!Helpers.isPrimitive(contextValue) && !ref) {
                try {
                    oldValue = structuredClone(contextValue);
                } catch(ex) {
                    Console.warn(this.nativeElement, `${name} input initial value cannot be cloned, error: ${ex}`);
                }
            } else {
                oldValue = contextValue;
            }

            this.contextInputValues!.set(name, oldValue);
        }

        if (!Helpers.equals(oldValue, value)) {//initial check
            let diffFound = true;
            let newValue = undefined;

            if (!Helpers.isPrimitive(value) && !ref) {
                try {
                    newValue = structuredClone(value);
                    diffFound = !Helpers.equals(oldValue, newValue);//check for classes and objects that lose proper prototype structure due to structuredClone
                } catch(ex) {//TODO: log exception only one time if each binding structuredClone fails?
                    diffFound = oldValue !== newValue; //no need to !Helpers.equals, just check with default value
                    Console.error(this.nativeElement, `${name} input set error, object cannot be cloned, try to use nb-in-ref:name instead of nb-in:name, error: ${ex}`);
                }
            } else {
                newValue = value;
            }

            if (diffFound) {
                this.contextInputValues!.set(name, newValue);
                this.contextInputsWithChangedValue!.add(name);
                this._isInputsDirty = true;
            }
        }
    }

    private disposeProtected(full: boolean): void {
        if (full) {
            delete this._previousEntityData;
            delete this._currentEntityData;
        }

        if (!Helpers.isUndefined(this.contextBinder)) {
            if (Helpers.isFunction(this.notifyContextDetached)) {
                this.notifyContextDetached!(this.contextBinder!.context!);
            }

            this.contextBinder!.dispose();

            delete this.contextBinder;
            delete this.contextInputValues;
            delete this.contextInputsWithChangedValue;
        }
    }
}