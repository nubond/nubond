import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';


import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

export class Properties extends Base implements IHandler<Map<string, IExpressionDetails>> {
    private readonly DEFAULT_PREFIX_AND_SEPARATOR = Constants.DEFAULT_PREFIX + Constants.DEFAULT_SEPARATOR;

    private readonly _nativeElement: HTMLElement;
    private readonly _elementValues: Map<string, any>;

    public readonly nExpression: Map<string, IExpressionDetails> | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }
    
    constructor(nativeElement: Element, attributes: Attributes) {
        super();

        this._nativeElement = <HTMLElement>nativeElement;
        this._elementValues = new Map<string, any>();

        if (attributes.has(Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME, true, true)) {
            this.hasNExpression = true;
            this.nExpression = new Map<string, IExpressionDetails>();

            for (const [key, value] of attributes.getAll(Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME, true)) {
                const rawPropertyName = key.replace(Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME + Constants.META_VALUE_SEPARATOR, '');
                if (rawPropertyName.length > 0) {
                    if (!Helpers.isUndefined(value)) {
                        const propertyName = Helpers.fromKebabToCamelCase(rawPropertyName);
                        if ((propertyName == 'classList') || (propertyName == 'className')) {
                            Console.error(nativeElement, `classes should be changed via ${this.DEFAULT_PREFIX_AND_SEPARATOR}class`);
                        } else if (propertyName == 'style') {
                            Console.error(nativeElement, `styles should be changed via ${this.DEFAULT_PREFIX_AND_SEPARATOR}style`);
                        } else if ((propertyName == 'textContent') || (propertyName == 'innerText')) {
                            Console.error(nativeElement, `text content should be changed via ${this.DEFAULT_PREFIX_AND_SEPARATOR}value`);
                        } else if (propertyName == 'innerHTML') {
                            Console.error(nativeElement, `html content should be changed via ${this.DEFAULT_PREFIX_AND_SEPARATOR}html`);
                        } else {
                            this.nExpression.set(propertyName, new ExpressionDetails(value!));    
                        }
                    } else {
                        Console.error(nativeElement, `property handler can't be empty`);
                    }  
                } else {
                    Console.error(nativeElement, `property name can't be empty`);
                }
            }
        } else {
            this.hasNExpression = false;
        }
    }

    public get(propertyKey: string): any {
        return (<{[key: string]: any}>this._nativeElement)[propertyKey];
    }

    public set(propertyKey: string, propertyValue: any): void {
        if (this._elementValues.get(propertyKey) !== propertyValue) {
            this._elementValues.set(propertyKey, propertyValue);
            this._isDirty = true;
        }
    }
    
    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            for (const [key, value] of this.nExpression!) {
                this.processExpressionExecution(value, `${Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME}:${key}`,
                                                expression => executeExpression(expression, executionParams), 
                                                data => this.set(key, data));
            }
        }

        return executionParams;
    }

    public commit(): boolean {
        const wasDirty = this.isDirty;

        if (this._isDirty) {
            for (const [key, value] of this._elementValues) {
                if (!Helpers.equals(value, (<{[key: string]: any}>this._nativeElement)[key])) {
                    (<{[key: string]: any}>this._nativeElement)[key] = value;
                }
            }

            this._isDirty = false;
        }

        return wasDirty;
    }
}