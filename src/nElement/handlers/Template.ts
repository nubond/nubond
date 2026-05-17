import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { NElementProjection } from '../NElementProjection';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Environment } from '../../Environment';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

export class Template extends Base implements IHandler<IExpressionDetails> {
    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;

    public readonly isDirty = false;

    constructor(nativeElement: Element, attributes: Attributes,
                constructSubTree: () => void, requestDetectChanges: () => void) {
        super();
        
        this.hasNExpression = false;

        const expression = <string | undefined>attributes.get(Constants.TEMPLATE_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            if (expression!.startsWith('@')) {
                const name = expression!.substring(1);
                if (Environment.templates.has(name)) {
                    this.hasNExpression = true;
                    this.nExpression = new ExpressionDetails(expression!);

                    Environment.templates.tryPrepare(name, asyncCallBack => {
                        const nElementProjection = new NElementProjection(nativeElement);
                        const template = Environment.templates.get(name);
                        
                        nativeElement.replaceChildren(...Array.from(template!.childNodes));
                        nElementProjection.process();

                        attributes.markAsReady(Constants.TEMPLATE_HANDLER_ATTRIBUTE_NAME);
                        
                        if (asyncCallBack) {
                            attributes.commit();
                        }

                        constructSubTree();

                        if (asyncCallBack) {
                            requestDetectChanges();
                        }
                    });
                } else {
                    Console.error(nativeElement, `invalid operation: template '${expression}' not found`);
                }
            } else {
                Console.error(nativeElement, `invalid operation: template name should start with '@'`);
            }
        }
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        return executionParams;
    }
    
    public commit(): boolean {
        return false;
    }
}