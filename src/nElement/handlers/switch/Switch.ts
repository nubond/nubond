import { IExpressionDetails } from '../../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../../interfaces/nElement/IHandler';
import { IVisible } from '../../../interfaces/nElement/IVisible';

import { InitializableBase } from '../base/InitializableBase';

import { Attributes } from '../Attributes';
import { Classes } from '../Classes';
import { Case } from './Case';
import { Default } from './Default';

import { ExpressionDetails } from '../../../expression/ExpressionDetails';
import { ExecutionParams } from '../../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../../Helpers';
import { Constants } from '../../../Constants';

export class Switch extends InitializableBase implements IHandler<IExpressionDetails>, IVisible {
    private readonly _classes: Classes | undefined;

    private readonly _cases: Array<Case> | undefined;
    private _default: Default | undefined;

    private _isFirstCommit = true;

    private _previousIsVisible = true;
    
    private _isVisible = true;
    public get isVisible(): boolean {
        return this._isVisible;
    }

    private _value: any = undefined;
    public get value(): any {
        return this._value;
    }
    protected set value(value: any) {
        this._value = value;
        this._isDirty = true;
    }

    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty || (this.hasNExpression && 
                                 (this._cases!.some(el => el.isDirty) || (!Helpers.isUndefined(this._default) && this._default!.isDirty)));
    }

    constructor(nativeElement: Element, attributes: Attributes, classes: Classes) {
        super(nativeElement, Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);
        
        const expression = <string | undefined>attributes.get(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            this._classes = classes;
            
            this.hasNExpression = true;
            this.nExpression = new ExpressionDetails(expression!);

            this._cases = [];
        } else {
            this.hasNExpression = false;
        }
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            this.processExpressionExecution(this.nExpression!, Constants.SWITCH_HANDLER_ATTRIBUTE_NAME,
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.value = Helpers.isPrimitive(data) && 
                                                                 (!Helpers.isNumber(data) || Helpers.isNumber(data) && !isNaN(data))
                                                                            ? data 
                                                                            : Helpers.stringify(data));

            for (const el of this._cases!) {
                el.bind(executionParams, executeExpression);
            }
        }

        return executionParams;
    }
    
    public commit(): boolean {
        let wasDirty = false;

            //  \/ public isDirty used due to nb-case`s
        if (this.isDirty) {
            if (this._isFirstCommit) {
                this._isFirstCommit = false;
                this.markAsReady();
            }

            for (const el of this._cases!) {
                el.commit();
            }

            this._isVisible = this._cases!.some(el => el.isVisible);

            if (!Helpers.isUndefined(this._default)) {
                if (this._isVisible) {
                    this._default!.hide();
                } else {
                    this._default!.show();
                }

                this._default!.commit();

                this._isVisible ||= this._default!.isVisible;
            }

            if (this._previousIsVisible !== this._isVisible) {
                if (this._isVisible) {
                    this._classes!.show(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);
                } else {
                    this._classes!.hide(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME);
                }

                this._previousIsVisible = this._isVisible;
                wasDirty = true;
            }

            this._isDirty = false;
        }

        return wasDirty;
    }

    public addCase(childCase: Case): () => void {
        this._cases!.push(childCase);

        const cases = this._cases;
        return function (): void {
            const expectedFnIndex = cases!.indexOf(childCase);
            if (expectedFnIndex >= 0) {
                cases!.splice(expectedFnIndex, 1);
            }
        };
    }

    public setDefault(childDefault: Default): () => void {
        if (Helpers.isUndefined(this._default)) {
            this._default = childDefault;
            const that = this;

            return function (): void {
                that._default = undefined;
            };
        } else {
            throw new Error('default is already defined');
        }
    }
}