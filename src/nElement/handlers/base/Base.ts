import { IExpressionDetails } from '../../../interfaces/expression/IExpressionDetails';

import { Helpers } from '../../../Helpers';

export abstract class Base {
    protected singleDataBindCache: Set<string> | undefined;

    protected processExpressionExecution<T>(expressionDetails: IExpressionDetails, expressionKey: string, 
                                            expressionExecutor: (expression: string | null | undefined) => T,
                                            expressionDataBinder: (data: T) => void,
                                            expressionExecutionSkipped?: () => void): void {
        if (expressionDetails.isSingleBinded) {
            if (Helpers.isUndefined(this.singleDataBindCache)) {
                this.singleDataBindCache = new Set<string>();
            }

            if (!this.singleDataBindCache!.has(expressionKey)) {
                const expressionResult = expressionExecutor(expressionDetails.expression);

                if(!Helpers.isUndefined(expressionResult)) {
                    this.singleDataBindCache!.add(expressionKey);
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
}