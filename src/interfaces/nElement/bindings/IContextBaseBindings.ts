import { IExpressionDetails } from '../../expression/IExpressionDetails';

export interface IContextInExpressionDetails {
    readonly nExpression: IExpressionDetails;
    readonly ref: boolean;
}

export interface IContextBaseBindings {
    readonly nExpression: IExpressionDetails;
    readonly nInExpression: Map<string, IContextInExpressionDetails> | undefined;

    readonly hasNInExpression: boolean; 
}