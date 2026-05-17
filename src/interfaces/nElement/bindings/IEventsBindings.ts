import { IExpressionDetails } from '../../expression/IExpressionDetails';

export interface IEventsBindings {
    readonly nExpression: IExpressionDetails;

    debounce: number | undefined;
}