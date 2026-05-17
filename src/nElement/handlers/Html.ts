import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';

export class Html extends Base implements IHandler<IExpressionDetails> {
    private readonly _nativeElement: Element | undefined;
    
    private readonly _htmlSanitizer: ((html: string) => string) | undefined;

    private _previousHtml = '';
    private _html = '';

    protected get html(): string {
        return this._html;
    }
    protected set html(html: string,) {
        this._html = html;
        this._isDirty = true;
    }
    
    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes, htmlSanitizer: ((html: string) => string) | undefined) {
        super();

        const expression = <string | undefined>attributes.get(Constants.HTML_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            this._nativeElement = nativeElement;
            this._htmlSanitizer = htmlSanitizer;

            this.hasNExpression = true;
            this.nExpression = new ExpressionDetails(expression!);
        } else {
            this.hasNExpression = false;
        }
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            this.processExpressionExecution(this.nExpression!, Constants.HTML_HANDLER_ATTRIBUTE_NAME, 
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.html = Helpers.stringify(data));
        }

        return executionParams;
    }
    
    public commit(): boolean {
        const wasDirty = this._isDirty;

        if (this._isDirty) {
            if (this._previousHtml !== this._html) {
                this._nativeElement!.innerHTML = Helpers.isFunction(this._htmlSanitizer)
                                                            ? this._htmlSanitizer!(this._html)
                                                            : this._html;
                this._previousHtml = this._html;
            }
            
            this._isDirty = false;
        }

        return wasDirty;
    }
}