import { IExpressionDetails } from '../interfaces/expression/IExpressionDetails';

import { Constants } from '../Constants';

export class ExpressionDetails implements IExpressionDetails {
    public readonly expression: string;
    public readonly isSingleBinded: boolean;

    constructor(expression: string) {
        const trimmedExpression = expression.trim();
        const firstChar = trimmedExpression.charAt(0);

        if ((firstChar === Constants.SINGLE_BIND_PREFIX_CHAR) || (firstChar === Constants.CONSTANT_BIND_PREFIX_CHAR)) {
            const cleanExpression = trimmedExpression.substring(1).trim();

            if (firstChar === Constants.CONSTANT_BIND_PREFIX_CHAR) {
                this.expression = cleanExpression.length > 0
                                            ? (((cleanExpression === 'true') || (cleanExpression === 'false'))
                                                        ? cleanExpression
                                                        : (isNaN(<any>cleanExpression) && isNaN(parseFloat(cleanExpression))
                                                                ? `"${cleanExpression.replaceAll('"', '\\"')}"`
                                                                : cleanExpression))
                                            : '""';
            } else {
                this.expression = cleanExpression;
            }

            this.isSingleBinded = true;
        } else {
            this.expression = trimmedExpression;
            this.isSingleBinded = false;
        }
    }
}