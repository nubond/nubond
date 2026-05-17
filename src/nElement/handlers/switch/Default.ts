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

export class Default extends Base implements IHandler<IExpressionDetails>, IDisposable {
    private readonly _classes: Classes | undefined;

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

    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes, classes: Classes, controllingSwitch: Switch | undefined) {
        super();
        
        const expression = <string | undefined>attributes.get(Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression) && (expression!.length === 0)) {
            if (!Helpers.isUndefined(controllingSwitch) && controllingSwitch!.hasNExpression) {
                try {
                    this._removeFromParentSwitch = controllingSwitch!.setDefault(this);

                    this._classes = classes;
                    
                    this.hasNExpression = true;
                } catch {
                    this.hasNExpression = false;

                    Console.error(nativeElement, `invalid operation: there should be only one ${Constants.DEFAULT_PREFIX}-default for one ${Constants.DEFAULT_PREFIX}-switch`);
                }
            } else {
                this.hasNExpression = false;

                Console.error(nativeElement, `invalid operation: ${Constants.DEFAULT_PREFIX}-default must have direct ${Constants.DEFAULT_PREFIX}-switch parent`);
            }
        } else {
            this.hasNExpression = false;
        }
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
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

    public show(): void {
        this.isVisible = true;
    }

    public hide(): void {
        this.isVisible = false;
    }

    public dispose(): void {
        if (this.hasNExpression && !Helpers.isUndefined(this._removeFromParentSwitch)) {
            this._removeFromParentSwitch!();
            this._removeFromParentSwitch = undefined;
        }
    }
}