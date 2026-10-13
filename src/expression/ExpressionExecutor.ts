import { IDisposable } from '../interfaces/IDisposable';

import { Environment } from '../Environment';

import { ExecutionParams } from './ExpressionExecParamsHelper';

import { Helpers } from '../Helpers';
import { Console } from '../Console';

export class ExpressionExecutor implements IDisposable {
    private readonly _showDebugInfo: () => boolean;
    private _unSubscribeFromTransformersOnAdded: (() => void) | undefined;

    private readonly _compiledFnCache = new Map<string | null | undefined, Map<string | undefined, (...args: any) => any>>();

    constructor(getShowDebugInfo: () => boolean) {
        this._showDebugInfo = getShowDebugInfo;
        this._unSubscribeFromTransformersOnAdded = Environment.transformers.onAdded(name => {
            this._compiledFnCache.clear(); //when new transformer is added all fn`s should be recompile
        });
    }

    public executeExpression(expression: string | null | undefined, context: object, element: Element, executionParams?: ExecutionParams): any {
        let identity: string | undefined;
        let names: ReadonlyArray<string>;
        let values: ReadonlyArray<any>;

        let compiledFn: ((...args: any) => any) | undefined;

        if (Helpers.isUndefined(executionParams)) {
            identity = undefined;
            names = [];
            values = [];
        } else {
            identity = executionParams!.identity;
            names = executionParams!.names;
            values = executionParams!.values;
        }
        
        let paramsToExpression = this._compiledFnCache.get(expression);
        if (!Helpers.isUndefined(paramsToExpression)) {
            compiledFn = paramsToExpression!.get(identity);
        } else {
            paramsToExpression = new Map<string, (...args: any) => any>();
            this._compiledFnCache.set(expression, paramsToExpression);
        }

        if (!Helpers.isFunction(compiledFn)) {
            try {
                compiledFn = this.compileFunction(expression, names, Environment.transformers.names, element);
                paramsToExpression!.set(identity, compiledFn);
            } catch(ex) {
                if (this._showDebugInfo()) {
                    throw ex;
                } else {
                    compiledFn = (() => (() => undefined));
                    paramsToExpression!.set(identity, compiledFn);
                    
                    Console.error(element, `expression "${expression}" compilation error: ${ex}`);
                }
            }
        }

        try {
            return compiledFn!.apply(context, <any[]>Environment.transformers.functions)
                              .apply(context, values);
        } catch(ex) {
            if (this._showDebugInfo()) {
                throw ex;
            } else {
                Console.error(element, `expression "${expression}" execution error: ${ex}`);
            }
        }
    }

    public dispose(): void {
        if (Helpers.isFunction(this._unSubscribeFromTransformersOnAdded)) {
            this._unSubscribeFromTransformersOnAdded!();
            delete this._unSubscribeFromTransformersOnAdded;
        }
    }

    //TODO: late transformer addition with duplicated name as variables or repeats will brake compilation, think of solution
    private compileFunction(expression: string | null | undefined, 
                            paramNames: ReadonlyArray<string>, transformerNames: ReadonlyArray<string>,
                            element: Element, 
                            multiStatementExpression: boolean = false): (...args: any) => any {
        try {
            let fnBody =  '"use strict"\n' +
                          `return function(${paramNames.join(',')}) {\n`;
            if (multiStatementExpression) {
                fnBody +=   `${expression};\n` +
                            'return;';
            } else {
                fnBody +=   `return (${expression});`;
            }
            fnBody +=     '}';

            return <(...args: any) => any>(new Function(...transformerNames, fnBody));
        } catch(ex) {
            if (!multiStatementExpression) {
                if (this._showDebugInfo()) {
                    Console.warn(element, 
                                 `expression '`, expression, `' is evaluated in multi-statement way,`,
                                 'this means that it will never have a return value.\n',
                                 `Typically this happens when expression has multiple parts splitted with ';', if this is the case, try to use comma operator (',') instead.\n`,
                                 `Error details: ${ex}.`);
                }
                return this.compileFunction(expression, paramNames, transformerNames, element, true);
            } else {
                throw ex;
            }
        }
    }
}