import { IExpressionDetails } from '../../../interfaces/expression/IExpressionDetails';
import { IContextInExpressionDetails } from '../../../interfaces/nElement/bindings/IContextBaseBindings';
import { IContextBaseBindings } from '../../../interfaces/nElement/bindings/IContextBaseBindings';

import { IHandler } from '../../../interfaces/nElement/IHandler';

import { IDisposable } from '../../../interfaces/IDisposable'

import { Base } from './Base';

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

export abstract class ContextedBase<T> extends Base implements IHandler<IContextBaseBindings>, IDisposable {
    private _isFirstCommit = true;

    private _executionParams: ExecutionParams | undefined;
    private _executeExpression: ((expression: string | null | undefined, executionParams: ExecutionParams | undefined) => any) | undefined;

    protected readonly nativeElement: Element | undefined;
    protected readonly attributes: Attributes | undefined;

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
                isElementVisible: () => boolean,
                notifyContextAttached?: (context: object) => void,
                notifyContextDetached?: (context: object) => void) {
        super();

        if (Helpers.isString(expression)) {
            this.nativeElement = nativeElement;
            this.attributes = attributes;
            
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
                                nInExpression.set(Helpers.fromKebabToCamelCase(propertyName),
                                                  new ContextInExpressionDetails(new ExpressionDetails(value!), 
                                                                                 handlerName == Constants.IN_REF_HANDLER_ATTRIBUTE_NAME));  
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
        const wasDirty = this.isDirty;

        if (this._isEntityDataDirty) {
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

                            this.bindInputs(this._executionParams!, this._executeExpression!);
                        }

                        if (Helpers.isFunction(this.notifyContextAttached)) {
                            this.notifyContextAttached!(this.contextBinder!.context!);
                        }

                        this._previousEntityData = this._currentEntityData;
                    }
                }
            } else {
                this.disposeProtected(true);
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
            }

            this._isVisibleDirty = false;
        }

        if (this._isInputsDirty) {
            if (Helpers.isObject(this.contextBinder)) {
                for (const name of this.contextInputsWithChangedValue!) {
                    const ref = this.nExpression!.nInExpression!.get(name)!.ref;
                    const value = this.contextInputValues!.get(name);
                    const useStructureClone = Helpers.isObject(value) && !ref;

                    try {
                        (<{[key: string]: any}>this.contextBinder!.context)[name] = useStructureClone
                                                                                        ? structuredClone(value) 
                                                                                        : value;
                    } catch(ex) {
                        Console.error(this.nativeElement,
                                      useStructureClone 
                                        ? `input set error, if object cannot be cloned, try to use nb-in-ref:name instead of nb-in:name, error: ${ex}`
                                        : `input set error: ${ex}`);
                    }
                }

                this.contextInputsWithChangedValue!.clear();

                this.contextBinder!.inputsRefreshIsDone();
                this.contextBinder!.detectChanges();
            } else {
                if (!Helpers.isUndefined(this.contextInputsWithChangedValue)) {
                    this.contextInputsWithChangedValue!.clear();
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

    protected bindInputs(executionParams: ExecutionParams | undefined, executeExpression: (expression: string | null | undefined, 
                                                                                         executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        for (const [key, value] of this.nExpression!.nInExpression!) {
            this.processExpressionExecution(value.nExpression, `${Constants.IN_HANDLER_ATTRIBUTE_NAME}:${key}`,
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.setInputValue!(key, data));
        }

        return executionParams;
    }

    protected setInputValue(propertyName: string, propertyValue: any): void {
        if (!Helpers.equals(propertyValue, this.contextInputValues!.has(propertyName)
                                                        ? this.contextInputValues!.get(propertyName)
                                                        : (<{[key: string]: any}>this.contextBinder!.context)[propertyName])) {
            this.contextInputValues!.set(propertyName, propertyValue);
            this.contextInputsWithChangedValue!.add(propertyName);
            this._isInputsDirty = true;
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