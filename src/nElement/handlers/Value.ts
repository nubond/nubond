import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';

export class Value extends Base implements IHandler<IExpressionDetails> {
    private readonly _nativeElement: Element | undefined;

    private _previousValue = '';
    private _value = '';

    protected get value(): string { 
        return this._value;
    }
    protected set value(value: string) {
        this._value = value;
        this._isDirty = true;
    }

    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;
    
    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes) {
        super();

        const expression = <string | undefined>attributes.get(Constants.VALUE_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            this._nativeElement = nativeElement;

            this.hasNExpression = true;
            this.nExpression = new ExpressionDetails(expression!);
        } else {
            this.hasNExpression = false;
        }
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            this.processExpressionExecution(this.nExpression!, Constants.VALUE_HANDLER_ATTRIBUTE_NAME, 
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.value = Helpers.stringify(data));
        }

        return executionParams;
    }
    
    public commit(): boolean {
        const wasDirty = this._isDirty;

        if (this._isDirty) {
            if (this._previousValue !== this._value) {
                this._nativeElement!.textContent = this._value;
                
                this._previousValue = this._value;
            }
            
            this._isDirty = false;
        }

        return wasDirty;
    }
}