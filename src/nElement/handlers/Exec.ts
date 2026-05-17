import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';

export class Exec extends Base implements IHandler<IExpressionDetails> {
    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;
    
    public readonly isDirty = false;
    
    constructor(attributes: Attributes) {
        super();
        
        const expression = <string | undefined>attributes.get(Constants.EXEC_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
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
            this.processExpressionExecution(this.nExpression!, Constants.EXEC_HANDLER_ATTRIBUTE_NAME, 
                                            expression => executeExpression(expression, executionParams),
                                            data => {});
        }

        return executionParams;
    }
    
    public commit(): boolean {
        return false;
    }
}