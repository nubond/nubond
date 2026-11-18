import { IExpressionDetails } from '../interfaces/expression/IExpressionDetails';

import { Helpers } from '../Helpers';
import { Constants } from '../Constants';

export class ExpressionDetails implements IExpressionDetails {
    private static readonly _cache = new Map<string, ExpressionDetails>();

    public readonly expression: string;
    public readonly isSingleBinded: boolean;

    private constructor(expression: string) {
        const trimmedExpression = expression.trim();
        const firstChar = trimmedExpression.charAt(0);

        if ((firstChar === Constants.EXPRESSIONS.SINGLE_BIND_PREFIX_CHAR) || (firstChar === Constants.EXPRESSIONS.CONSTANT_BIND_PREFIX_CHAR)) {
            const cleanExpression = trimmedExpression.substring(1).trim();

            if (firstChar === Constants.EXPRESSIONS.CONSTANT_BIND_PREFIX_CHAR) {
                this.expression = cleanExpression.length > 0
                                            ? (((cleanExpression === 'true') || (cleanExpression === 'false') ||
                                                (cleanExpression === 'null') || (cleanExpression === 'undefined'))
                                                        ? cleanExpression
                                                        : (!isNaN(Number(cleanExpression))
                                                                ? cleanExpression
                                                                : `"${cleanExpression.replaceAll('\\', '\\\\')
                                                                                     .replaceAll('"', '\\"')
                                                                                     .replaceAll('\n', '\\n')
                                                                                     .replaceAll('\r', '\\r')
                                                                                     .replaceAll('\t', '\\t')}"`))
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

    public static create(expression: string): ExpressionDetails {
        let expressionDetails = this._cache.get(expression);
        if (Helpers.isUndefined(expressionDetails)) {
            expressionDetails = new ExpressionDetails(expression);
            this._cache.set(expression, expressionDetails);
        }

        return expressionDetails!;
    }
}