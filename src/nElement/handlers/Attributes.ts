import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';

import { Base } from './base/Base';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

//TODO: think about solution of boolean attributes 
//(disabled, checked, readonly, hidden, etc.) require null or false, if passed false it will become xxx="false"
export class Attributes extends Base implements IHandler<Map<string, IExpressionDetails>> {
    private readonly _nativeElement: Element;

    private readonly _systemAttributes: Map<string, string>  | undefined;
    private readonly _systemAttributesKeys: Array<string> | undefined;

    private _previousAttributes = new Map<string, string | undefined>();
    private _attributes: Map<string, string | undefined>;
    
    public readonly nExpression: Map<string, IExpressionDetails> | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, showDebugInfo: boolean) {
        super();
        
        this._nativeElement = nativeElement;

        this.hasNExpression = false;

        if (nativeElement.hasAttributes()) {
            const systemAttributes = new Map<string, string>();
            const handlerNameWithMeta = Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME + Constants.META_VALUE_SEPARATOR;

            for (const name of nativeElement.getAttributeNames()) {
                const value = nativeElement.getAttribute(name)!;
                
                if (name.indexOf(Constants.PREFIX_AND_SEPARATOR) === 0) {
                    const attributeValue = value.trim();
                    const attributeHasValue = Helpers.isNotEmptyString(attributeValue);

                    if (attributeHasValue || (!attributeHasValue && Constants.HANDLERS.KNOWN_HANDLERS_WITHOUT_VALUE.some(el => name.startsWith(el)))) {
                        if (name.indexOf(handlerNameWithMeta) === 0) {
                            const attributeName = name.replace(handlerNameWithMeta, '');
                            
                            if (attributeName.length > 0) {
                                if (attributeName == 'class') { 
                                    Console.error(nativeElement, `classes should be changed via ${Constants.HANDLERS.CLASS_HANDLER_ATTRIBUTE_NAME}`);
                                } else if (attributeName == 'style') { 
                                    Console.error(nativeElement, `styles should be changed via ${Constants.HANDLERS.STYLE_HANDLER_ATTRIBUTE_NAME}`);
                                } else if (Constants.HANDLERS.KNOWN_HANDLERS_SET.has(attributeName) ||
                                           Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_OPTIONAL_META.has(attributeName) ||
                                           Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR.some(el => attributeName.startsWith(el)) || 
                                           Constants.HANDLERS.KNOWN_PREFIX_HANDLERS.some(el => attributeName == el) ||
                                           Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.has(attributeName) || 
                                           Constants.HANDLERS.KNOWN_HANDLER_PREFIX_EXTENSIONS_WITH_META_SEPARATOR.some(el => attributeName.startsWith(el)) ||
                                           Constants.HANDLERS.KNOWN_HANDLER_PREFIX_EXTENSIONS.some(el => attributeName == el) ||
                                           Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES.has(attributeName)) {
                                    Console.error(nativeElement, `system (${attributeName}) attribute changes is not allowed`);
                                } else {
                                    if (attributeName.startsWith('on') && showDebugInfo) {
                                        Console.warn(nativeElement, `${attributeName} looks like an HTML Event Attribute, event subscription should be done via ${Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME}`);
                                    }

                                    this.hasNExpression = true;

                                    if (!this.nExpression) {
                                        this.nExpression = new Map<string, IExpressionDetails>();
                                    }

                                    if (!this.nExpression.has(attributeName)) {
                                        this.nExpression.set(attributeName, ExpressionDetails.create(attributeValue));
                                    } else {
                                        Console.error(nativeElement, `multiple handlers for one attribute (${attributeName}) are not supported`);
                                    }
                                }
                            } else {
                                Console.error(nativeElement, `attribute name can't be empty`);
                            }
                        } else {
                            if (Constants.HANDLERS.KNOWN_HANDLERS_SET.has(name) || 
                                Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_OPTIONAL_META.has(name) ||
                                Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR.some(el => name.startsWith(el)) ||
                                Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.has(name) || 
                                Constants.HANDLERS.KNOWN_HANDLER_PREFIX_EXTENSIONS_WITH_META_SEPARATOR.some(el => name.startsWith(el)) ||
                                Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES.has(name)) {
                                if (!systemAttributes.has(name)) {
                                    systemAttributes.set(name, attributeValue);
                                } else {
                                    Console.error(nativeElement, `multiple ${name} found`);
                                }
                            } else if (Constants.HANDLERS.KNOWN_PREFIX_HANDLERS.some(el => name == el) || 
                                       Constants.HANDLERS.KNOWN_HANDLER_PREFIX_EXTENSIONS.some(el => name == el)) {
                                Console.error(nativeElement, `incorrect binding found, ${name} should have meta value, like: nb-in:input-name="", nb-in-ref:ref-input-name="", nb-var:variable-name="", nb-event:event-name="", nb-prop:property-name="", nb-attr:attribute-name=""`);
                            } else {
                                this._previousAttributes.set(name, value); //custom user nb-* attribute with value
                            }
                        }
                    } else {
                        if (Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES.has(name) || 
                            name.endsWith(Constants.HANDLERS.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX)) {
                            if (!systemAttributes.has(name)) {
                                systemAttributes.set(name, attributeValue);
                            }
                        } else if (Constants.HANDLERS.KNOWN_HANDLERS_SET.has(name) || 
                                   Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_OPTIONAL_META.has(name) ||
                                   Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR.some(el => name.startsWith(el)) ||
                                   Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.has(name) || 
                                   Constants.HANDLERS.KNOWN_HANDLER_PREFIX_EXTENSIONS_WITH_META_SEPARATOR.some(el => name.startsWith(el))) {
                            Console.error(nativeElement, `incorrect binding found, ${name} attributes should have value.`);
                        } else {
                            this._previousAttributes.set(name, value); //custom user nb-* attribute without value
                        }
                    }
                } else {
                    this._previousAttributes.set(name, value);
                }
            }

            this._attributes = new Map<string, string | undefined>(this._previousAttributes);
            this._systemAttributes = systemAttributes;
            this._systemAttributesKeys = [...systemAttributes.keys()];
        } else {
            this._attributes = new Map<string, string | undefined>();
        }
    }

    public has(attributeNameOrPrefix: string, isSystem?: boolean, isPrefix?: boolean, isPrefixRequired = true): boolean {
        if (isSystem === true) {
            if (!Helpers.isUndefined(this._systemAttributes)) {
                if (isPrefix === true) {
                    const fullAttributeNameAndPrefix = attributeNameOrPrefix + Constants.META_VALUE_SEPARATOR;
                    return this._systemAttributesKeys!.some(el => isPrefixRequired 
                                                                    ? (el.indexOf(fullAttributeNameAndPrefix) === 0)
                                                                    : ((el === attributeNameOrPrefix) || (el.indexOf(fullAttributeNameAndPrefix) === 0)));
                } else {
                    return this._systemAttributes!.has(attributeNameOrPrefix);
                }
            } else {
                return false;
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
            if (!Helpers.isUndefined(this._systemAttributes)) {
                if (isPrefix === true) {
                    const fullAttributeNameAndPrefix = attributeNameOrPrefix + Constants.META_VALUE_SEPARATOR;
                    const attributeKey = this._systemAttributesKeys!.find(el => isPrefixRequired 
                                                                                ? (el.indexOf(fullAttributeNameAndPrefix) === 0)
                                                                                : ((el === attributeNameOrPrefix) || (el.indexOf(fullAttributeNameAndPrefix) === 0)));
                    if (Helpers.isString(attributeKey)) {
                        const attributeValue = this._systemAttributes!.get(attributeKey!);
                        if (Helpers.isString(attributeValue)) {
                            return [attributeKey!, attributeValue!];
                        }
                    }
                } else {
                    return this._systemAttributes!.get(attributeNameOrPrefix);
                }
            } else {
                return undefined;
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

        if (isSystem === true) {
            if (!Helpers.isUndefined(this._systemAttributes)) {
                if (Helpers.isString(attributeNameOrPrefix)) {
                    result = new Map<string, string | undefined>();
                    const fullAttributeNameAndPrefix = attributeNameOrPrefix! + Constants.META_VALUE_SEPARATOR;

                    if (isPrefixRequired) {
                        for (const [key, value] of this._systemAttributes!) {
                            if (key.indexOf(fullAttributeNameAndPrefix) === 0) {
                                result.set(key, value);
                            }
                        }
                    } else {
                        for (const [key, value] of this._systemAttributes!) {
                            if ((key === attributeNameOrPrefix) || (key.indexOf(fullAttributeNameAndPrefix) === 0)) {
                                result.set(key, value);
                            }
                        }
                    }
                } else {
                    result = new Map<string, string | undefined>();
                    
                    for (const [key, value] of this._systemAttributes!) {
                        result.set(key, value);
                    }
                }
            } else {
                result = new Map<string, string | undefined>();
            }

            return result;
        } else {
            if (Helpers.isString(attributeNameOrPrefix)) {
                result = new Map<string, string | undefined>();
                const attributeNameAndPrefix = attributeNameOrPrefix! + Constants.META_VALUE_SEPARATOR;

                if (isPrefixRequired) {
                    for (const [key, value] of this._attributes) {
                        if (key.indexOf(attributeNameAndPrefix) === 0) {
                            result.set(key, value);
                        }
                    }
                } else {
                    for (const [key, value] of this._attributes) {
                        if ((key === attributeNameOrPrefix) || (key.indexOf(attributeNameAndPrefix) === 0)) {
                            result.set(key, value);
                        }
                    }
                }
            } else {
                result = new Map<string, string | undefined>(this._attributes);
            }

            return Object.freeze(result);
        }
    }

    public set(attributeName: string, attributeValue?: string | null): void {
        if (!Helpers.isUndefined(this._systemAttributes) && this._systemAttributes!.has(attributeName)) {
            throw new Error(`${Constants.DISPLAY_NAME}: system (${attributeName}) attribute changes during runtime are not allowed.`);
        }

        this.setInternal(attributeName, attributeValue);
    }

    public remove(attributeName: string): void {
        if (!Helpers.isUndefined(this._systemAttributes) && this._systemAttributes!.has(attributeName)) {
            throw new Error(`${Constants.DISPLAY_NAME}: system (${attributeName}) attribute removal during runtime are not allowed.`);
        }

        if (this.has(attributeName)) {
            this._attributes.delete(attributeName);
            this._isDirty = true;
        }
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            for (const [key, value] of this.nExpression!) {
                this.processExpressionExecution(value, `${Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME}:${key}`,
                                                expression => executeExpression(expression, executionParams), 
                                                data => this.set(key, data));
            }
        }

        return executionParams;
    }
    
    public commit(): boolean {
        let wasDirty = false;

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
                wasDirty = true;
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
        for (const name of nativeElement.getAttributeNames()) {
            if (Constants.HANDLERS.KNOWN_HANDLERS_SET.has(name) || Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_OPTIONAL_META.has(name)) {
                return true;
            } else {
                for (const el of Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR) {
                    if (name.indexOf(el) === 0) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}