import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IElementManipulationsConsumer } from '../../interfaces/nElement/IElementManipulationsConsumer';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams, ExpressionExecParamsHelper } from '../../expression/ExpressionExecParamsHelper';

import { ElementManipulations } from '../../models/injections/ElementManipulations';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';

export class Bound extends Base implements IHandler<IExpressionDetails | undefined>, IElementManipulationsConsumer {
    private _isFirstBind = true;

    private readonly _nativeElement: Element | undefined;
    private readonly _getElementManipulations: (() => ElementManipulations) | undefined;

    public readonly hasElementManipulations: boolean;

    public nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;
    
    public readonly isDirty = false;
    
    constructor(nativeElement: Element, attributes: Attributes, getElementManipulations: () => ElementManipulations) {
        super();
        
        const expression = <string | undefined>attributes.get(Constants.HANDLERS.BOUND_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            this._nativeElement = nativeElement;

            this.hasNExpression = true;
            this.nExpression = ExpressionDetails.create((expression!.startsWith(Constants.EXPRESSIONS.SINGLE_BIND_PREFIX_CHAR) || expression!.startsWith(Constants.EXPRESSIONS.CONSTANT_BIND_PREFIX_CHAR)) 
                                                                                        ? expression! 
                                                                                        : `${Constants.EXPRESSIONS.SINGLE_BIND_PREFIX_CHAR}${expression!}`);
            this.hasElementManipulations = Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP.test(this.nExpression.expression);

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
        if (this.hasNExpression && this._isFirstBind) {
            this._isFirstBind = false;

            const extendedExecParams = ExpressionExecParamsHelper.createOrExtendBoundExecParams(this._nativeElement!, this._getElementManipulations?.(), 
                                                                                                executionParams);
            this.processExpressionExecution(this.nExpression!, Constants.HANDLERS.BOUND_HANDLER_ATTRIBUTE_NAME, 
                                            expression => executeExpression(expression, extendedExecParams),
                                            data => {});

            this.nExpression = undefined;
        }

        return executionParams;
    }
    
    public commit(): boolean {
        return false;
    }
}