import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IVisible } from '../../interfaces/nElement/IVisible';

import { InitializableBase } from './base/InitializableBase';

import { Attributes } from './Attributes';
import { Classes } from './Classes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExpressionExecParamsHelper, ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Environment } from '../../Environment';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

type RepeatDataType = 'array-like' | 'object' | 'number';

export class Repeat extends InitializableBase implements IHandler<IExpressionDetails>, IVisible {
    private readonly _nativeElement: Element | undefined;
    private readonly _classes: Classes | undefined;
    private readonly _showDebugInfo: (() => boolean) | undefined;

    private readonly _requestNElementClone: (() => void) | undefined;
    private readonly _requestNElementRemoval: (() => void) | undefined;
    private readonly _dataSource: Repeat | undefined;
    private readonly _cloneOf: Repeat | undefined;

    private _isFirstCommit = true;

    private _currentItem: any;

    private _previousIsVisible = true;
    
    private _isVisible = true;
    public get isVisible(): boolean {
        return this._isVisible;
    }
    protected set isVisible(isVisible: boolean) {
        this._isVisible = isVisible;
        this._isDirty = true;
    }

    protected hasClone = false;

    private _totalCount = -1;
    protected get totalCount(): number {
        return this._dataSource!._totalCount;
    }
    private _dataType: RepeatDataType | undefined;
    protected get dataType(): RepeatDataType | undefined {
        return this._dataSource!._dataType;
    }
    private _data: Array<any> | string | {[key: string]: any} | undefined;
    protected get data(): Array<any> | string | {[key: string]: any} | undefined {
        return this._dataSource!._data;
    }
    private _dataFields: Array<string> | undefined;
    protected get dataFields(): Array<string> | undefined {
        return this._dataSource!._dataFields;
    }

    protected readonly prefix: string | undefined;
    protected readonly repeatIndex: number | undefined;
    
    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;
    
    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes, classes: Classes,
                requestNElementClone: () => void, requestNElementRemoval: () => void,
                getShowDebugInfo: () => boolean,
                cloneOf?: Repeat) {
        super(nativeElement, Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);

        const attributeData = attributes.get(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME, true, true, false);
        if (Helpers.isArray(attributeData)) {
            const attributeName = (<[string, string]>attributeData)[0];
            const prefix = attributeName === Constants.REPEAT_HANDLER_ATTRIBUTE_NAME
                                ? undefined
                                : attributeName.replace(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME + Constants.META_VALUE_SEPARATOR, '');
            let isValidPrefix = true;

            if (!Helpers.isUndefined(prefix)) {
                if (!Helpers.isValidIdentifier(prefix!)) {
                    isValidPrefix = false;
                    Console.error(nativeElement,`repeat prefix '${prefix}' name cannot be created, it is not a valid identifier.`);
                } else {
                    const itemPrefixed = this.getContextParameterName(Constants.ITEM_EXECUTION_PARAM_NAME, prefix);
                    if (Environment.transformers.names.indexOf(itemPrefixed) >= 0) {
                        isValidPrefix = false;
                        Console.error(nativeElement,`repeat prefix '${prefix}' name cannot be created, it is conflicting with ${itemPrefixed} transformer.`);
                    } else {
                        const indexPrefixed = this.getContextParameterName(Constants.INDEX_EXECUTION_PARAM_NAME, prefix);
                        if (Environment.transformers.names.indexOf(indexPrefixed) >= 0) {
                            isValidPrefix = false;
                            Console.error(nativeElement,`repeat prefix '${prefix}' name cannot be created, it is conflicting with ${indexPrefixed} transformer.`);
                        } else {
                            const totalCountPrefixed = this.getContextParameterName(Constants.TOTAL_COUNT_EXECUTION_PARAM_NAME, prefix);
                            if (Environment.transformers.names.indexOf(totalCountPrefixed) >= 0) {
                                isValidPrefix = false;
                                Console.error(nativeElement,`repeat prefix '${prefix}' name cannot be created, it is conflicting with ${totalCountPrefixed} transformer.`);
                            }
                        }
                    }
                }
            }         
            
            if (isValidPrefix) {
                this._nativeElement = nativeElement;
                this._classes = classes;
                this._requestNElementClone = requestNElementClone;
                this._requestNElementRemoval = requestNElementRemoval;
                this._showDebugInfo = getShowDebugInfo;

                this.prefix = prefix;
                this.hasNExpression = true;
                this.nExpression = new ExpressionDetails((<[string, string]>attributeData)[1]);

                if (!Helpers.isUndefined(cloneOf)) {
                    this._cloneOf = cloneOf;
                    this._dataSource = cloneOf!._dataSource;
                    this.repeatIndex = cloneOf!.repeatIndex! + 1;
                } else {
                    this._dataSource = this;
                    this.repeatIndex = 0;
                }
            } else {
                this.hasNExpression = false;
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

            if (this.repeatIndex === 0) {
                this.processExpressionExecution(this.nExpression!, Constants.REPEAT_HANDLER_ATTRIBUTE_NAME, 
                                                expression => executeExpression(expression, executionParams),  
                                                data => {
                                                    this.processData(data);
                                                    currentExecutionParams = this.processRepeat(currentExecutionParams)
                                                },
                                                () => currentExecutionParams = this.createOrExtendRepeatParams(executionParams, this._currentItem));
            } else {
                currentExecutionParams = this.processRepeat(currentExecutionParams);
            }

            return currentExecutionParams;
        } else {
            return executionParams;
        }        
    }
    
    public commit(): boolean {
        let wasDirty = false;

        if (this._isDirty) {
            if (this._isFirstCommit) {
                this._isFirstCommit = false;
                this.markAsReady();
            }

            if (this._previousIsVisible !== this._isVisible) {
                if (this._isVisible) {
                    this._classes!.show(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);
                } else {
                    this._classes!.hide(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);
                }

                this._previousIsVisible = this._isVisible;
                wasDirty = true;
            }

            this._isDirty = false;
        }

        return wasDirty
    }

    private processData(rawData: any) {
        let totalCount = -1;
        let dataType: RepeatDataType | undefined;
        let data: Array<any> | string | {[key: string]: any} | undefined;
        let dataFields: Array<string> | undefined;

        if (!Helpers.isUndefined(rawData) && (rawData !== null)) {
            if (Helpers.isArray(rawData) || Helpers.isTypedArray(rawData) || Helpers.isString(rawData)) {
                dataType = 'array-like';
                totalCount = rawData.length;
                data = rawData;
            } else if (Helpers.isIterableCollection(rawData)) {
                dataType = 'array-like';
                totalCount = rawData.size;
                data = Array.from(rawData);
            } else {
                if (Helpers.isNumber(rawData)) {
                    const rawTotalCount = Math.floor(rawData);
                    if ((rawTotalCount > 0) && (rawTotalCount < Infinity)) {
                        dataType = 'number';
                        totalCount = rawTotalCount;
                    }
                } else {
                    if (this._showDebugInfo!()) {
                        Console.warn(this._nativeElement, "Low performance for repeat expression is expected, consider refactoring to repeat thru array-like objects and not over: ", rawData);
                    }

                    let propNames: Array<string> = [];

                    for (const name in rawData) {
                        propNames.push(name);
                    }

                    dataType = 'object';
                    totalCount = propNames.length;
                    data = rawData;
                    dataFields = propNames;
                }
            }
        }

        this._dataType = dataType;
        this._totalCount = totalCount;
        this._data = data;
        this._dataFields = dataFields;
    }

    private processRepeat(executionParams: ExecutionParams | undefined): ExecutionParams | undefined {
        let item: any = undefined;
        let removeRequested = false;

        if (this.totalCount > this.repeatIndex!) {
            this.isVisible = true;

            item = this.dataType == 'number'
                        ? this.repeatIndex! + 1
                        : (this.dataType == 'array-like'
                                ? (<Array<any> | string>this.data)[this.repeatIndex!]
                                : (<{[key: string]: any}>this.data)[this.dataFields![this.repeatIndex!]]);

            if (this.totalCount > this.repeatIndex! + 1) {
                if (!this.hasClone) {
                    this._requestNElementClone!();
                    this.hasClone = true;
                }
            }
        } else {
            if (this.repeatIndex === 0) {
                this.isVisible = false;
            } else {
                this._requestNElementRemoval!();
                this._cloneOf!.hasClone = false;
                removeRequested = true;
            }
        }

        if (!removeRequested) {
            if (this.nExpression!.isSingleBinded) {
                this._currentItem = item;
            }

            return this.createOrExtendRepeatParams(executionParams, item);
        } else {
            return executionParams;
        }
    }

    private getContextParameterName(parameterName: string, prefix: string | undefined): string {
        return Helpers.isNotEmptyString(prefix)
                        ? `${prefix}${Helpers.toPascalCase(parameterName)}`
                        : parameterName;
    }

    private createOrExtendRepeatParams(executionParams: ExecutionParams | undefined, item: any): ExecutionParams | undefined {
        return ExpressionExecParamsHelper.createOrExtendRepeatParams(item, this.repeatIndex!, this.totalCount,
                                                                     parameterName => this.getContextParameterName(parameterName, this.prefix),
                                                                     executionParams);
    }
}