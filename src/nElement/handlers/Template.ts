import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { ITemplateBindings } from '../../interfaces/nElement/bindings/ITemplateBindings';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IConstructable } from '../../interfaces/nElement/IConstructable';

import { IContextBinder } from '../../interfaces/contextBinders/IContextBinder';

import { InitializableBase } from './base/InitializableBase';

import { NElementProjection } from '../NElementProjection';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Environment } from '../../Environment';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class TemplateBindings implements ITemplateBindings {
    public readonly nExpression: IExpressionDetails;
    public readonly name: string;

    constructor (nExpression: IExpressionDetails, name: string) {
        this.nExpression = nExpression;
        this.name = name;
    }
}

export class Template extends InitializableBase implements IHandler<ITemplateBindings | undefined>, IConstructable {
    private _nativeElement: Element | undefined
    private _contextBinder: IContextBinder | undefined;
    private _constructSubTree: (() => void) | undefined;

    private _nElementProjection: NElementProjection | undefined;

    public nExpression: ITemplateBindings | undefined;
    public readonly hasNExpression: boolean;

    public readonly isDirty = false;

    constructor(nativeElement: Element, attributes: Attributes, contextBinder: IContextBinder,
                constructSubTree: () => void) {
        super(nativeElement, Constants.HANDLERS.TEMPLATE_HANDLER_ATTRIBUTE_NAME);
        
        this.hasNExpression = false;

        const expression = <string | undefined>attributes.get(Constants.HANDLERS.TEMPLATE_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            if (expression!.startsWith(Constants.EXPRESSIONS.CONSTANT_BIND_PREFIX_CHAR)) {
                const name = expression!.substring(1);
                if (Environment.templates.has(name)) {
                    this.hasNExpression = true;
                    this.nExpression = new TemplateBindings(ExpressionDetails.create(expression!), name);

                    this._nativeElement = nativeElement;
                    this._contextBinder = contextBinder;
                    this._constructSubTree = constructSubTree;

                    this._nElementProjection = new NElementProjection(nativeElement, nativeElement, false);
                } else {
                    Console.error(nativeElement, `invalid operation: template '${expression}' not found`);
                }
            } else {
                Console.error(nativeElement, `invalid operation: template name should start with '${Constants.EXPRESSIONS.CONSTANT_BIND_PREFIX_CHAR}'`);
            }
        }
    }

    public construct(): void {
        if (this.hasNExpression) {
            const nExpressionName = this.nExpression!.name;

            const prepareResult = Environment.templates.tryPrepare(nExpressionName, asyncCallBack => {
                const template = Environment.templates.get(nExpressionName);
                
                if (!Helpers.isUndefined(template)) {
                    this._nativeElement!.replaceChildren(...Array.from(template!.childNodes));
                    this._nElementProjection!.project();

                    this.markAsReady();

                    this._constructSubTree!();

                    if (asyncCallBack) {
                        this._contextBinder!.detectChanges();
                    }
                } else {
                    this.markAsReady();
                    this.fallbackView(asyncCallBack);
                }

                this.dispose();
            });

            if (!prepareResult) {
                this.markAsReady();
                this.fallbackView(false);
                this.dispose();
                Console.error(this.nativeElement, `invalid operation: Template with name '${nExpressionName}' is unable to get HTML template.`);
            }

            this.nExpression = undefined;
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

    private fallbackView(requestDetectChanges: boolean): void {
        const fallbackExists = this._nElementProjection!.fallback();

        if (fallbackExists) {
            this._constructSubTree!();

            if (requestDetectChanges) {
                this._contextBinder!.detectChanges();
            }
        } else {
            let child = this.nativeElement!.firstChild;
            while (child !== null) {
                child.remove();
                child = this.nativeElement!.firstChild;
            }
        }
    }

    private dispose(): void {
        this._nativeElement = undefined;
        this._contextBinder = undefined;
        this._constructSubTree = undefined;
        this._nElementProjection = undefined;
    }
}