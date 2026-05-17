import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExpressionExecParamsHelper, ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Environment } from '../../Environment';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

export class Variables extends Base implements IHandler<Map<string, IExpressionDetails>> {
    public readonly nExpression: Map<string, IExpressionDetails> | undefined;
    public readonly hasNExpression: boolean;
    
    public readonly isDirty = false;

    constructor(nativeElement: Element, attributes: Attributes) {
        super();

        if (attributes.has(Constants.VARIABLE_HANDLER_PREFIX_NAME, true, true)) {
            this.hasNExpression = true;
            this.nExpression = new Map<string, IExpressionDetails>();

            for (const [key, value] of attributes.getAll(Constants.VARIABLE_HANDLER_PREFIX_NAME, true)) {
                const valueName = key.replace(Constants.VARIABLE_HANDLER_PREFIX_NAME + Constants.META_VALUE_SEPARATOR, '');
                if (valueName.length > 0) {
                    if (!Helpers.isUndefined(value)) {
                        const contextValueName = Helpers.fromKebabToCamelCase(valueName);
                        const lowerCaseContextValueName = contextValueName.toLowerCase();

                        if (Constants.RESERVED_CONTEXT_NAMES.has(lowerCaseContextValueName)) {
                            Console.error(nativeElement, `value with '${contextValueName}' name cannot be created, this name is reserved.`);
                            continue;
                        } else if (Environment.transformers.has(lowerCaseContextValueName)) {
                            Console.error(nativeElement,`value with '${contextValueName}' name cannot be created, it is conflicting with case-insensitive transformer name.`);
                            continue;
                        }

                        this.nExpression.set(contextValueName, new ExpressionDetails(value!));
                    } else {
                        Console.error(nativeElement, `value handler can't be empty`);
                    }
                } else {
                    Console.error(nativeElement, `value name can't be empty`);
                }
            }
        } else {
            this.hasNExpression = false;
        }
    }   
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            let currentExecutionParams = executionParams;
            const dataMap = new Map<string, any>();

            for (const [key, value] of this.nExpression!) {
                this.processExpressionExecution(value, `${Constants.VARIABLE_HANDLER_PREFIX_NAME}:${key}`,
                                                expression => executeExpression(expression, currentExecutionParams), 
                                                data => dataMap.set(key, data));

                if (dataMap.size > 0) {
                    currentExecutionParams = ExpressionExecParamsHelper.createOrExtendVarExecParams(dataMap, executionParams);
                }
            }

            return currentExecutionParams;
        } else {
            return executionParams;
        }
    }
    
    public commit(): boolean {
        return false;
    }
}