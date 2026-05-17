import { ExpressionExecParamsHelper, ExecutionParams } from './ExpressionExecParamsHelper';

import { Helpers } from '../Helpers';
import { Console } from '../Console';

export class ExpressionExecutor {
    private readonly _showDebugInfo: () => boolean;

    private readonly _compiledFnCache = new Map<string, (...args: any) => any>();

    constructor(getShowDebugInfo: () => boolean) {
        this._showDebugInfo = getShowDebugInfo;
    }

    public executeExpression(expression: string | null | undefined, context: object, element: Element, executionParams?: ExecutionParams): any {
        const extendedExecParams = ExpressionExecParamsHelper.createOrExtendExecParams(executionParams);
        
        let expressionKey = `${expression}:`; // is faster then const expressionKey = `${extendedExecParams.names.join(',')}:${expression}`; | TODO: Optimize?
        for (const el of extendedExecParams.names) {
            expressionKey += `${el},`;
        }

        let compiledFn = this._compiledFnCache.get(expressionKey);
        if (!Helpers.isFunction(compiledFn)) {
            try {
                compiledFn = this.compileFunction(expression, extendedExecParams.names, element);
                this._compiledFnCache.set(expressionKey, compiledFn);
            } catch(ex) {
                if (this._showDebugInfo()) {
                    throw ex;
                } else {
                    Console.error(element, `expression "${expression}" compilation error: ${ex}`);
                    this._compiledFnCache.set(expressionKey, () => undefined);
                }
            }
        }

        try {
            return compiledFn!.apply(context, extendedExecParams.values);
        } catch(ex) {
            if (this._showDebugInfo()) {
                throw ex;
            } else {
                Console.error(element, `expression "${expression}" execution error: ${ex}`);
            }
        }
    }

    private compileFunction(expression: string | null | undefined, paramNames: Array<string>, element: Element,
                            multiStatementExpression: boolean = false): (...args: any) => any {
        try {
            let fnBody =  '"use strict"\n';
            if (multiStatementExpression) {
                fnBody += `${expression};\n` +
                          'return;';
            } else {
                fnBody += `return (${expression});`;
            }

            return <(...args: any) => any>(new Function(...paramNames, fnBody));
        } catch(ex) {
            if (!multiStatementExpression) {
                if (this._showDebugInfo()) {
                    Console.warn(element, 
                                 `expression '`, expression, `' is evaluated in multi-statement way,`,
                                 'this means that it will never have a return value.\n',
                                 `Typically this happens when expression has multiple parts splitted with ';', if this is the case, try to use comma operator (',') instead.\n`,
                                 `Error details: ${ex}.`);
                }
                return this.compileFunction(expression, paramNames, element, true);
            } else {
                throw ex;
            }
        }
    }
}