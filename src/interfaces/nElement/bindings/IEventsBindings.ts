import { IExpressionDetails } from '../../expression/IExpressionDetails';

export interface IEventsBindings {
    readonly nExpression: IExpressionDetails;

    readonly debounce: number | undefined;
}