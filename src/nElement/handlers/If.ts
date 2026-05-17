import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IVisible } from '../../interfaces/nElement/IVisible';

import { Base } from './base/Base';

import { Attributes } from './Attributes';
import { Classes } from './Classes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Constants } from '../../Constants';
import { Helpers } from '../../Helpers';

export class If extends Base implements IHandler<IExpressionDetails>, IVisible {
    private readonly _attributes: Attributes | undefined;
    private readonly _classes: Classes | undefined;

    private _isFirstCommit = true;

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

    constructor(attributes: Attributes, classes: Classes) {
        super();
        
        const expression = <string | undefined>attributes.get(Constants.IF_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            this._attributes = attributes;
            this._classes = classes;

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
            this.processExpressionExecution(this.nExpression!, Constants.IF_HANDLER_ATTRIBUTE_NAME,
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.isVisible = !!data);
        }

        return executionParams;
    }
    
    public commit(): boolean {
        const wasDirty = this._isDirty;

        if (this._isDirty) {
            if (this._isFirstCommit) {
                this._isFirstCommit = false;
                this._attributes!.markAsReady(Constants.IF_HANDLER_ATTRIBUTE_NAME);
            }

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
}