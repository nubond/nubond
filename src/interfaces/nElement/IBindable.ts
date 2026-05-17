import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

export interface IBindable {
    bind(executionParams: ExecutionParams | undefined,
         executeExpression: (expression: string | null | undefined, 
                             executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined;
}