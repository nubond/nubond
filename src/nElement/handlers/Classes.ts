import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IVisibilityHandler } from '../../interfaces/nElement/IVisibilityHandler'; 

import { Base } from './base/Base';

import { IClassesBindings } from '../../interfaces/nElement/bindings/IClassesBindings';
import { IExpressionPreviousValue } from '../../interfaces/expression/IExpressionDetails';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Attributes } from './Attributes';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class ArrayExpressionDetails extends ExpressionDetails implements IExpressionDetails, IExpressionPreviousValue<string> {
    public previousValue: string | undefined;

    constructor(expression: string) {
        super(expression);
    }
}

class ConditionExpressionData implements IClassesBindings<Map<string, IExpressionDetails>> {
    public readonly type = 'condition';

    public readonly rawExpression = new Map<string, IExpressionDetails>();

    constructor(nativeElement: Element, rawExpression: string) {
        const splittedExpressions = rawExpression.substring(1, rawExpression.length - 1).trim().split(';');
        if (splittedExpressions.length > 0) {
            for (var el of splittedExpressions) {
                const trimmedEL = el.trim();
                if (Helpers.isNotEmptyString(trimmedEL)) { 
                    const firstSeparatorIndex = trimmedEL.indexOf(':');

                    if (firstSeparatorIndex > 0) {
                        const rawClassName = trimmedEL.substring(0, firstSeparatorIndex).trim();
                        const className = rawClassName.trim();

                        if (className.length > 0) {
                            this.rawExpression.set(className, new ExpressionDetails(trimmedEL.substring(firstSeparatorIndex + 1)));   
                        } else {
                            Console.error(nativeElement, `class name can't be empty`);
                        }
                    } else {
                        Console.error(nativeElement, 'incorrect conditional class expression, expected: {class-name1: condition1; class-name2: condition2}');
                    }
                }
            }
        } else {
            Console.error(nativeElement, `class condition expression (${rawExpression}) has empty conditions set.`);
        }
    }

    static isThisType(rawExpression: string): boolean {
        return (rawExpression.charAt(0) === '{') && (rawExpression.charAt(rawExpression.length - 1) === '}');
    }
}

class ArrayExpressionData implements IClassesBindings<Array<ArrayExpressionDetails>> {
    public readonly type = 'array';

    public readonly rawExpression: Array<ArrayExpressionDetails>;

    constructor(nativeElement: Element, rawExpression: string) {
        const splittedExpressions = rawExpression.substring(1, rawExpression.length - 1).trim()
                                                                                        .split(';')
                                                                                        .map(el => el.trim())
                                                                                        .filter(el => el.length > 0);
        if (splittedExpressions.length > 0) {
            this.rawExpression = splittedExpressions.map(el => new ArrayExpressionDetails(el));
        } else {
            this.rawExpression = [];
            Console.error(nativeElement, `class array expression (${rawExpression}) has empty value.`);
        }
    }

    static isThisType(rawExpression: string): boolean {
        return (rawExpression.charAt(0) === '[') && (rawExpression.charAt(rawExpression.length - 1) === ']');
    }
}

class SimpleExpressionData implements IClassesBindings<IExpressionDetails>, IExpressionPreviousValue<string>  {
    public readonly type = 'simple';
    
    public previousValue: string | undefined
    public readonly rawExpression: IExpressionDetails;

    constructor(nativeElement: Element, rawExpression: string) {
        this.rawExpression = new ExpressionDetails(rawExpression);
    }

    static isThisType(rawExpression: string): boolean {
        return (rawExpression.charAt(0) !== '{') && (rawExpression.charAt(rawExpression.length - 1) !== '}') && 
               (rawExpression.charAt(0) !== '[') && (rawExpression.charAt(rawExpression.length - 1) !== ']');
    }
}

export class Classes extends Base implements IHandler<IClassesBindings<IExpressionDetails> | 
                                                      IClassesBindings<Array<IExpressionDetails>> | 
                                                      IClassesBindings<Map<string, IExpressionDetails>>>,
                                             IVisibilityHandler {
    private readonly _getHideClassName: () => string;
    private readonly _setClassName: (className: string) => void;

    private _previousClassNames: Array<string>;
    private _classNames: Array<string>;

    public readonly nExpression: IClassesBindings<IExpressionDetails> | 
                                 IClassesBindings<Array<IExpressionDetails>> | 
                                 IClassesBindings<Map<string, IExpressionDetails>> | 
                                 undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes, getHideClassName: () => string) {
        super();
        
        this._getHideClassName = getHideClassName;

        if (nativeElement.tagName.toLowerCase() == 'svg') {
            //className in svg is a SVGAnimatedString and not class names
            this._setClassName = function (className: string) {
                nativeElement.setAttribute('class', className);
            };
        } else {
            this._setClassName = function (className: string) {
                nativeElement.className = className;
            };
        }

        if (nativeElement.className.length > 0) {
            this._previousClassNames = nativeElement.className.split(' ');
        } else {
            this._previousClassNames = [];
        }

        const expression = <string | undefined>attributes.get(Constants.CLASS_HANDLER_ATTRIBUTE_NAME, true);
        if (Helpers.isString(expression)) {
            this.hasNExpression = true;

            if (ConditionExpressionData.isThisType(expression!)) {
                this.nExpression = new ConditionExpressionData(nativeElement, expression!);
            } else if (ArrayExpressionData.isThisType(expression!)) {
                this.nExpression = new ArrayExpressionData(nativeElement, expression!);
            } else {
                this.nExpression = new SimpleExpressionData(nativeElement, expression!);
            }
        } else {
            this.hasNExpression = false;
        }

        this._classNames = this._previousClassNames.slice();
    }

    public has(className: string): boolean {
        return this._classNames.indexOf(className) >= 0;
    }

    public getAll(): Readonly<Array<string>> {
        return Object.freeze(this._classNames.slice());
    }

    public add(className: string): void {
        if ((className.length > 0) && !this.has(className)) {
            this._classNames.push(className);
            this._isDirty = true;
        }
    }

    public remove(className: string): void {
        const valueIndex = this._classNames.indexOf(className);
        if (valueIndex >= 0) {
            this._classNames.splice(valueIndex, 1);
            this._isDirty = true;
        }
    }

    public toggle(className: string, targetExpression?: IExpressionPreviousValue<string>): void {
        if (!Helpers.isUndefined(targetExpression)) {
            if (Helpers.isString(targetExpression!.previousValue) && (targetExpression!.previousValue !== className)) {
                this.remove(targetExpression!.previousValue!);
            }

            targetExpression!.previousValue = className;
            this.add(className);
        } else {
            if (this.has(className)) {
                this.remove(className);
            } else {
                this.add(className);
            }
        }
    }
    
    public show(): void {
        this.remove(this._getHideClassName());
    }

    public hide(): void  {
        this.add(this._getHideClassName());
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            switch(this.nExpression!.type) {
                case 'simple':
                    const currentExpressionDetails = <IExpressionDetails & IExpressionPreviousValue<string>>this.nExpression!.rawExpression;
                    this.processExpressionExecution(currentExpressionDetails, Constants.CLASS_HANDLER_ATTRIBUTE_NAME, 
                                                    expression => executeExpression(expression, executionParams), 
                                                    data => this.toggle(Helpers.stringify(data), currentExpressionDetails));
                break;
                case 'array':
                    const arrayExpressions = <Array<IExpressionDetails>>this.nExpression!.rawExpression;
                    for (let index = 0; index < arrayExpressions.length; index++) {
                        const currentExpressionDetails = <IExpressionDetails & IExpressionPreviousValue<string>>arrayExpressions[index];
                        this.processExpressionExecution(currentExpressionDetails, `[${Constants.CLASS_HANDLER_ATTRIBUTE_NAME}]:${index}`, 
                                                        expression => executeExpression(expression, executionParams), 
                                                        data => this.toggle(Helpers.stringify(data), currentExpressionDetails));
                    }
                break;
                case 'condition':
                    for (const [key, value] of <Map<string, IExpressionDetails>>this.nExpression!.rawExpression) {
                        this.processExpressionExecution(value, `{${Constants.CLASS_HANDLER_ATTRIBUTE_NAME}}:${key}`, 
                                                        expression => executeExpression(expression, executionParams), 
                                                        data => {
                                                            if (!!data) {
                                                                this.add(key);
                                                            } else {
                                                                this.remove(key);
                                                            }
                                                        });
                    }
                break;
            }
        }
    
        return executionParams;
    }
    
    public commit(): boolean {
        const wasDirty = this._isDirty;

        if (this._isDirty) {
            if (this._previousClassNames.length !== this._classNames.length) {
                                    // \/ className used due to better performance in comparison with classList | TODO: Optimize
                this._setClassName(this._classNames.join(' '));
                this._previousClassNames = this._classNames.slice();
            } else {   
                for (let index = 0; index < this._classNames.length; index++) {
                    if (this._classNames[index] != this._previousClassNames[index]) {
                                          // \/ className used due to better performance in comparison with classList | TODO: Optimize
                        this._setClassName(this._classNames.join(' '));
                        this._previousClassNames = this._classNames.slice();
    
                        break;
                    }
                }
            }

            this._isDirty = false;
        }

        return wasDirty;
    }
}