import { IExpressionDetails } from '../../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../../interfaces/nElement/IHandler';

import { IDisposable } from '../../../interfaces/IDisposable'

import { Base } from '../base/Base';

import { Attributes } from '../Attributes';
import { Classes } from '../Classes';
import { Switch } from './Switch';

import { ExpressionDetails } from '../../../expression/ExpressionDetails';
import { ExecutionParams } from '../../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../../Helpers';
import { Constants } from '../../../Constants';
import { Console } from '../../../Console';

export class Case extends Base implements IHandler<IExpressionDetails>, IDisposable {
    private readonly _classes: Classes | undefined;
    private readonly _controllingSwitch: Switch | undefined;

    private _removeFromParentSwitch: (() => void) | undefined;

    private _previousIsVisible = true;
    
    private _isVisible = true;
    public get isVisible(): boolean {
        return this._isVisible;
    }
    protected set isVisible(isVisible: boolean) {
        this._isVisible = isVisible;
        this._isDirty = true;
    }

    private _name = '';
    protected get name(): string {
        return this._name;
    }
    protected set name(value: string) {
        this._name = value;
    }

    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes, classes: Classes, controllingSwitch: Switch | undefined) {
        super();
        
        const expression = <string | undefined>attributes.get(Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            if (!Helpers.isUndefined(controllingSwitch) && controllingSwitch!.hasNExpression) {
                this._classes = classes;
                this._controllingSwitch = controllingSwitch;

                this.hasNExpression = true;
                this.nExpression = new ExpressionDetails(expression!);
                
                this._removeFromParentSwitch = controllingSwitch!.addCase(this);
            } else {
                this.hasNExpression = false;

                Console.error(nativeElement, `invalid operation: ${Constants.DEFAULT_PREFIX}-case must have direct ${Constants.DEFAULT_PREFIX}-switch parent`);
            }
        } else {
            this.hasNExpression = false;
        }
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            this.processExpressionExecution(this.nExpression!, Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME,
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.name = Helpers.stringify(data));

            this.isVisible = this._controllingSwitch!.value === this.name;
        }

        return executionParams;
    }
    
    public commit(): boolean {
        const wasDirty = this._isDirty;

        if (this._isDirty) {
            if (this._previousIsVisible !== this._isVisible) {
                if (this._isVisible) {
                    this._classes!.show();
                } else {
                    this._classes!.hide();
                }

                this._previousIsVisible = this._isVisible;
            }

            this._isDirty = false;
        }

        return wasDirty;
    }

    public dispose(): void {
        if (this.hasNExpression && !Helpers.isUndefined(this._removeFromParentSwitch)) {
            this._removeFromParentSwitch!();
            this._removeFromParentSwitch = undefined;
        }
    }
}