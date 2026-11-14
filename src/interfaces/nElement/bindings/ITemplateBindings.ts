import { IExpressionDetails } from '../../expression/IExpressionDetails';

export interface ITemplateBindings {
    readonly nExpression: IExpressionDetails;

    readonly name: string;
}