import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

export class Attributes extends Base implements IHandler<Map<string, IExpressionDetails>> {
    private readonly DEFAULT_PREFIX_AND_SEPARATOR = Constants.DEFAULT_PREFIX + Constants.DEFAULT_SEPARATOR;
    private readonly ATTRIBUTE_PREFIX_AND_SEPARATOR = Constants.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME + Constants.META_VALUE_SEPARATOR;

    private readonly _nativeElement: Element;

    private readonly _systemAttributes = new Map<string, string>();
    private readonly _systemAttributesKeys: Array<string>;

    private _previousAttributes = new Map<string, string | undefined>();
    private _attributes: Map<string, string | undefined>;
    
    public readonly nExpression: Map<string, IExpressionDetails> | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element) {
        super();
        
        this._nativeElement = nativeElement;

        this.hasNExpression = false;

        if (nativeElement.hasAttributes()) {
            for (const attribute of nativeElement.attributes) {
                if (attribute.name.indexOf(this.DEFAULT_PREFIX_AND_SEPARATOR) === 0) {
                    const attributeValue = attribute.value.trim();
                    const attributeHasValue = Helpers.isNotEmptyString(attributeValue);
                    if (attributeHasValue || (!attributeHasValue && Constants.KNOWN_HANDLERS_WITHOUT_VALUE.some(el => attribute.name.startsWith(el)))) {
                        const partiallyCleanAttributeName = attribute.name.replace(this.DEFAULT_PREFIX_AND_SEPARATOR, '');

                        if (partiallyCleanAttributeName.indexOf(this.ATTRIBUTE_PREFIX_AND_SEPARATOR) === 0) {
                            const attributeName = partiallyCleanAttributeName.replace(this.ATTRIBUTE_PREFIX_AND_SEPARATOR, '');
                            
                            if (attributeName.length > 0) {
                                if (attributeName == 'class') { 
                                    Console.error(nativeElement, `classes should be changed via ${this.DEFAULT_PREFIX_AND_SEPARATOR}class`);
                                } else if (attributeName == 'style') { 
                                    Console.error(nativeElement, `styles should be changed via ${this.DEFAULT_PREFIX_AND_SEPARATOR}style`);
                                } else if (Constants.KNOWN_HANDLERS_SET.has(attributeName) ||
                                           Constants.KNOWN_PREFIX_HANDLERS.some(el => attributeName.startsWith(el)) || 
                                           Constants.KNOW_HANDLER_EXTENSIONS.has(attributeName) || 
                                           Constants.KNOW_HANDLER_EXTENSIONS_WITHOUT_VALUES.has(attributeName)) {
                                    Console.error(nativeElement, `system (${attributeName}) attribute changes is not allowed`);
                                } else {
                                    this.hasNExpression = true;

                                    if (!this.nExpression) {
                                        this.nExpression = new Map<string, IExpressionDetails>();
                                    }

                                    this.nExpression.set(attributeName, new ExpressionDetails(attributeValue));
                                }
                            } else {
                                Console.error(nativeElement, `attribute name can't be empty`);
                            }
                        } else {
                            if (!this._systemAttributes.has(partiallyCleanAttributeName)) {
                                 this._systemAttributes.set(partiallyCleanAttributeName, attributeValue);
                            } else {
                                Console.error(nativeElement, `multiple ${this.DEFAULT_PREFIX_AND_SEPARATOR}${partiallyCleanAttributeName} found`);
                            }
                        }
                    } else if (!Constants.KNOW_HANDLER_EXTENSIONS_WITHOUT_VALUES.has(attribute.name) && 
                               !attribute.name.endsWith(Constants.HANDLER_READY_ATTRIBUTE_SUFFIX)) {
                        Console.error(nativeElement, `incorrect binding found, ${attribute.name} attributes should have value.`);
                    }
                } else {
                    this._previousAttributes.set(attribute.name, attribute.value);
                }
            }

            this._attributes = new Map<string, string | undefined>(this._previousAttributes);
            this._systemAttributesKeys = [...this._systemAttributes.keys()];
        } else {
            this._attributes = new Map<string, string | undefined>();
            this._systemAttributesKeys = [];
        }
    }

    public has(attributeNameOrPrefix: string, isSystem?: boolean, isPrefix?: boolean, isPrefixRequired = true): boolean {
        if (isSystem === true) {
            if (isPrefix === true) {
                const attributeNameAndPrefix = attributeNameOrPrefix + Constants.META_VALUE_SEPARATOR;
                return this._systemAttributesKeys.some(el => isPrefixRequired 
                                                                ? (el.indexOf(attributeNameAndPrefix) === 0)
                                                                : ((el === attributeNameOrPrefix) || (el.indexOf(attributeNameAndPrefix) === 0)));
            } else {
                return this._systemAttributes.has(attributeNameOrPrefix);
            }
        } else {
            if (isPrefix === true) {
                const attributeNameAndPrefix = attributeNameOrPrefix + Constants.META_VALUE_SEPARATOR;
                const keys = this._attributes.keys();
                let result = false;

                if (isPrefixRequired) {
                    for (const el of keys) {
                        if (el.indexOf(attributeNameAndPrefix) === 0) {
                            result = true;
                            break;
                        }
                    }
                } else {
                    for (const el of keys) {
                        if ((el === attributeNameOrPrefix) || (el.indexOf(attributeNameAndPrefix) === 0)) {
                            result = true;
                            break;
                        }
                    }
                }

                return result;
            } else {
                return this._attributes.has(attributeNameOrPrefix);
            }
        }
    }

    public get(attributeNameOrPrefix: string, isSystem?: boolean, isPrefix?: boolean, isPrefixRequired = true): string | undefined | [string, string] {
        if (isSystem === true) {
            if (isPrefix === true) {
                const attributeNameAndPrefix = attributeNameOrPrefix + Constants.META_VALUE_SEPARATOR;
                const attributeKey = this._systemAttributesKeys.find(el => isPrefixRequired 
                                                                            ? (el.indexOf(attributeNameAndPrefix) === 0)
                                                                            : ((el === attributeNameOrPrefix) || (el.indexOf(attributeNameAndPrefix) === 0)));
                if (Helpers.isString(attributeKey)) {
                    const attributeValue = this._systemAttributes.get(attributeKey!);
                    if (Helpers.isString(attributeValue)) {
                        return [attributeKey!, attributeValue!];
                    }
                }
            } else {
                return this._systemAttributes.get(attributeNameOrPrefix);
            }
        } else {
            if (isPrefix === true) {
                const attributeNameAndPrefix = attributeNameOrPrefix + Constants.META_VALUE_SEPARATOR;
                const keys = this._attributes.keys();
                let attributeKey = undefined;

                if (isPrefixRequired) {
                    for (const el of keys) {
                        if (el.indexOf(attributeNameAndPrefix) === 0) {
                            attributeKey = el;
                            break;
                        }
                    }
                } else {
                    for (const el of keys) {
                        if ((el === attributeNameOrPrefix) || (el.indexOf(attributeNameAndPrefix) === 0)) {
                            attributeKey = el;
                            break;
                        }
                    }
                }

                if (Helpers.isString(attributeKey)) {
                    const attributeValue = this._attributes.get(attributeKey!);
                    if (Helpers.isString(attributeValue)) {
                        return [attributeKey!, attributeValue!];
                    }
                }
            } else {
                return this._attributes.get(attributeNameOrPrefix);
            }
        }
    }

    public getAll(attributeNameOrPrefix?: string, isSystem?: boolean, isPrefixRequired = true): Readonly<Map<string, string | undefined>> {
        let result: Map<string, string | undefined>;
        const source = (isSystem === true ? this._systemAttributes : this._attributes);

        if (Helpers.isString(attributeNameOrPrefix)) {
            result = new Map<string, string | undefined>();
            for (const [key, value] of source) {
                const attributeNameAndPrefix = attributeNameOrPrefix! + Constants.META_VALUE_SEPARATOR;
                if (isPrefixRequired) {
                    if (key.indexOf(attributeNameAndPrefix) === 0) {
                        result.set(key, value);
                    }
                } else {
                    if ((key === attributeNameOrPrefix) || (key.indexOf(attributeNameAndPrefix) === 0)) {
                        result.set(key, value);
                    }
                }
            }
        } else {
            result = new Map<string, string | undefined>(source);
        }
        
        return Object.freeze(result);
    }

    public set(attributeName: string, attributeValue?: string | null): void {
        if (this._systemAttributes.has(attributeName)) {
            throw new Error(`${Constants.DISPLAY_NAME}: system (${attributeName}) attribute changes during runtime are not allowed.`);
        }

        this.setInternal(attributeName, attributeValue);
    }

    public remove(attributeName: string): void {
        if (this._systemAttributes.has(attributeName)) {
            throw new Error(`${Constants.DISPLAY_NAME}: system (${Constants.DEFAULT_PREFIX}-${attributeName}) attribute removal during runtime are not allowed.`);
        }

        if (this.has(attributeName)) {
            this._attributes.delete(attributeName);
            this._isDirty = true;
        }
    }
    
    public markAsReady(nElementAttributeName: string): void {
        const attributeName = this.DEFAULT_PREFIX_AND_SEPARATOR + nElementAttributeName + Constants.DEFAULT_SEPARATOR + Constants.HANDLER_READY_ATTRIBUTE_SUFFIX;
        if (!this._systemAttributes.has(attributeName)) {
            this._systemAttributes.set(attributeName, '');
        }
        
        this._attributes.set(attributeName, '');
        this._isDirty = true;
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            for (const [key, value] of this.nExpression!) {
                this.processExpressionExecution(value, `${Constants.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}:${key}`,
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
    
            for (const [key, value] of this._previousAttributes) {
                if (!this._attributes.has(key)) {
                    this._nativeElement.removeAttribute(key);
                    attrsObjectsSyncRequired = true;
                }
            }
    
            for (const [key, value] of this._attributes) {
                const previousValue = this._previousAttributes.get(key);
                if (Helpers.isUndefined(previousValue) || (!Helpers.isUndefined(previousValue) && (value !== previousValue))) {
                    this._nativeElement.setAttribute(key, value!);
                    attrsObjectsSyncRequired = true;
                }
            }
    
            if (attrsObjectsSyncRequired) {
                this._previousAttributes = new Map<string, string | undefined>(this._attributes); //TODO: Optimize
            }

            this._isDirty = false;
        }

        return wasDirty;
    }

    private setInternal(attributeName: string, attributeValue?: string | null): void {
        if (Helpers.isUndefined(attributeValue) || (attributeValue === null)) {
            if (this.has(attributeName)) {
                this._attributes.delete(attributeName);
                this._isDirty = true;
            }
        } else {
            const stringifiedAttributeValue = Helpers.stringify(attributeValue!);
            if (this.get(attributeName) !== stringifiedAttributeValue) {
                this._attributes.set(attributeName, stringifiedAttributeValue);
                this._isDirty = true;
            }
        }
    }

    public static isNApplicable(nativeElement: Element): boolean {
        if ((nativeElement.nodeType === Node.ELEMENT_NODE) && nativeElement.hasAttributes()) {
            for (const attribute of nativeElement.attributes) {
                if (Constants.KNOWN_HANDLERS_SET.has(attribute.name)) {
                    return true;
                } else {
                    for (const el of Constants.KNOWN_PREFIX_HANDLERS) {
                        if (attribute.name.indexOf(el) === 0) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }
}