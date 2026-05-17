import { IAspectContext } from '../../contexts/IAspectContext'
import { IExpressionDetails } from '../../expression/IExpressionDetails';

export interface IAspectBindings {
    readonly nExpression: IExpressionDetails | undefined;

    aspect: IAspectContext;
    data: any;
}