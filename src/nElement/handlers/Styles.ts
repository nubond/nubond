import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../Helpers';
import { Console } from '../../Console';
import { Constants } from '../../Constants';

export class Styles extends Base implements IHandler<Map<string, IExpressionDetails>> {
    private readonly _nativeElement: HTMLElement;

    private _previousStyles: Map<string, string>;
    private _styles: Map<string, string>;

    public readonly nExpression: Map<string, IExpressionDetails>| undefined;;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }
    
    constructor(nativeElement: Element, attributes: Attributes) {
        super();
        
        this._nativeElement = <HTMLElement>nativeElement;
        this._previousStyles = new Map<string, string>();

        const expression = <string | undefined>attributes.get(Constants.STYLE_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            this.hasNExpression = true;
            
            this.nExpression = new Map<string, IExpressionDetails>();
            
            for (const el of expression!.trim().split(';')) {
                const trimmedEL = el.trim();
                if (Helpers.isNotEmptyString(trimmedEL)) {
                    const firstSeparatorIndex = trimmedEL.indexOf(':');
                    if (firstSeparatorIndex > 0) {
                        const stylePropertyName = trimmedEL.substring(0, firstSeparatorIndex).trim();
                        if (stylePropertyName.length > 0) {
                            this.nExpression.set(stylePropertyName, new ExpressionDetails(trimmedEL.substring(firstSeparatorIndex + 1)));
                            this._previousStyles.set(stylePropertyName, this._nativeElement.style.getPropertyValue(stylePropertyName));   
                        } else {
                            Console.error(nativeElement, `style property name can't be empty`);
                        }
                    } else {
                        Console.error(nativeElement, `has incorrect style expression '${expression}', expected: style-property1: value1; style-property2: value2`);
                    }
                }
            }
        } else {
            this.hasNExpression = false;
        }

        this._styles = new Map<string, string>(this._previousStyles);
    }

    public has(propertyName: string): boolean {
        return this._styles.has(propertyName);
    }

    public get(propertyName: string): string | undefined {
        return this._styles.get(propertyName);
    }

    public getAll(): Readonly<Map<string, string>> {
        return Object.freeze(new Map<string, string>(this._styles));
    }

    public set(propertyName: string, propertyValue?: string | null): void {
        if (Helpers.isUndefined(propertyValue) || (propertyValue === null) || (Helpers.isString(propertyValue) && propertyValue!.length == 0)) {
            this.remove(propertyName);
        } else {
            const stringifiedPropertyValue = Helpers.stringify(propertyValue!);
            if (this.get(propertyName) !== stringifiedPropertyValue) {
                this._styles.set(propertyName, stringifiedPropertyValue);
                this._isDirty = true;
            }
        }
    }

    public remove(propertyName: string): void {
        if (this.has(propertyName)) {
            this._styles.delete(propertyName);
            this._isDirty = true;
        }
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            for (const [key, value] of this.nExpression!) {
                this.processExpressionExecution(value, `${Constants.STYLE_HANDLER_ATTRIBUTE_NAME}:${key}`, 
                                                expression => executeExpression(expression, executionParams),
                                                data => this.set(key, data));
            }
        }

        return executionParams;
    }
    
    public commit(): boolean {
        const wasDirty = this._isDirty;

        if (this._isDirty) {
            let attrsObjectsSyncRequired = false;

            for (const [key, value] of this._previousStyles) {
                if (!this._styles.has(key)) {
                    this._nativeElement.style.setProperty(key, '');
                    attrsObjectsSyncRequired = true;
                }
            }

            for (const [key, value] of this._styles) {
                const previousValue = this._previousStyles.get(key);
                if (Helpers.isUndefined(previousValue) || (!Helpers.isUndefined(previousValue) && (value !== previousValue))) {
                    this._nativeElement.style.setProperty(key, value!);
                    attrsObjectsSyncRequired = true;
                }
            }

            if (attrsObjectsSyncRequired) {
                this._previousStyles = new Map<string, string>(this._styles); //TODO: Optimize
            }

            this._isDirty = false;
        }

        return wasDirty;
    }
}