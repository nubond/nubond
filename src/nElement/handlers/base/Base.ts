import { IExpressionDetails } from '../../../interfaces/expression/IExpressionDetails';

import { Helpers } from '../../../Helpers';

export abstract class Base {
    private _executedSingleBindExpressions: Set<string> | undefined;

    protected processExpressionExecution<T>(expressionDetails: IExpressionDetails, expressionKey: string, 
                                            expressionExecutor: (expression: string | null | undefined) => T,
                                            expressionDataBinder: (data: T) => void,
                                            expressionExecutionSkipped?: () => void): void {
        if (expressionDetails.isSingleBinded) {
            if (Helpers.isUndefined(this._executedSingleBindExpressions)) {
                this._executedSingleBindExpressions = new Set<string>();
            }

            if (!this._executedSingleBindExpressions!.has(expressionKey)) {
                const expressionResult = expressionExecutor(expressionDetails.expression);

                if(!Helpers.isUndefined(expressionResult)) {
                    this._executedSingleBindExpressions!.add(expressionKey);
                    expressionDataBinder(expressionResult);
                }
            } else {
                if (Helpers.isFunction(expressionExecutionSkipped)) {
                    expressionExecutionSkipped!();
                }
            }
        } else {
            expressionDataBinder(expressionExecutor(expressionDetails.expression));
        }
    }

    protected resetExpressionExecutionState(expressionDetails: IExpressionDetails, expressionKey: string): void {
        if (expressionDetails.isSingleBinded) {
            if (!Helpers.isUndefined(this._executedSingleBindExpressions)) {
                this._executedSingleBindExpressions!.delete(expressionKey);
            }
        }
    }
}