import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';
import { IAspectContext } from '../../interfaces/contexts/IAspectContext';
import { IAspectBindings } from '../../interfaces/nElement/bindings/IAspectBindings';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IDisposable } from '../../interfaces/IDisposable';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExpressionDetails } from '../../expression/ExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Environment } from '../../Environment';

import { ChangeDetector } from '../../models/injections/ChangeDetector';
import { ElementSubscriptions } from '../../models/injections/ElementSubscriptions';
import { ElementManipulations } from '../../models/injections/ElementManipulations';
import { EventDispatcher } from '../../models/injections/EventDispatcher';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class AspectBindings implements IAspectBindings {
    public readonly nExpression: IExpressionDetails | undefined;
    public readonly aspect: IAspectContext;
    public data: any;

    constructor(nExpression: IExpressionDetails | undefined, aspect: IAspectContext) {
        this.nExpression = nExpression;
        this.aspect = aspect;
    }
}

export class Aspects extends Base implements IHandler<Map<string, IAspectBindings>>, IDisposable {
    private static readonly _adoptedCssStyleSheetsTracker = new Map<CSSStyleSheet, number>();

    private _isDisposed = false;

    private _adoptedStylesRoot: Document | ShadowRoot | undefined;
    private _adoptedCssStyleSheet: Array<CSSStyleSheet> | undefined;
    
    public readonly nExpression: Map<string, IAspectBindings> | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes,
                getElementManipulations: () => ElementManipulations, getElementSubscriptions: () => ElementSubscriptions, getEventDispatcher: () => EventDispatcher,
                requestDetectChanges: () => void) {
        super();
        
        if (attributes.has(Constants.ASPECT_HANDLER_PREFIX_NAME, true, true)) {
            this.hasNExpression = true;
            this.nExpression = new Map<string, IAspectBindings>();

            let root: Document | ShadowRoot | undefined;

            for (const [key, value] of attributes.getAll(Constants.ASPECT_HANDLER_PREFIX_NAME, true)) {
                const aspectName = key.replace(Constants.ASPECT_HANDLER_PREFIX_NAME + Constants.META_VALUE_SEPARATOR, '');
                if (aspectName.length > 0) {
                    if (Environment.aspects.has(aspectName)) {
                        const aspectMetaData = Environment.aspects.instantiate(aspectName, nativeElement, 
                                                                               new ChangeDetector(() => requestDetectChanges()),
                                                                               getElementManipulations(), getElementSubscriptions(), getEventDispatcher());
                        if (!Helpers.isUndefined(aspectMetaData)) {
                            const [aspect, hasStyles] = aspectMetaData!;
                            this.nExpression.set(aspectName, new AspectBindings(Helpers.isNotEmptyString(value) ? new ExpressionDetails(value!) : undefined, 
                                                                                <IAspectContext>aspect));

                            if (hasStyles) {
                                Environment.aspects.tryPrepare(aspectName, () => {
                                    if (!this._isDisposed) {
                                        const styles = Environment.aspects.getStyles(aspectName);
                                        if (Helpers.isArray(styles)) {
                                            const [aspectCssStyleSheet, adoptedStyleNames] = styles!;

                                            if (!Helpers.isUndefined(aspectCssStyleSheet) || Helpers.isArray(adoptedStyleNames)) {
                                                if (Helpers.isUndefined(root)) {
                                                    const rootNode = nativeElement.getRootNode();
                                                    root = rootNode instanceof ShadowRoot ? rootNode : document;

                                                    this._adoptedStylesRoot = root;
                                                    this._adoptedCssStyleSheet = [];
                                                }

                                                //handle own styles (aspectCssStyleSheet)
                                                if (!Helpers.isUndefined(aspectCssStyleSheet)) {
                                                    if (root!.adoptedStyleSheets.indexOf(aspectCssStyleSheet!) < 0) {
                                                        root!.adoptedStyleSheets.push(aspectCssStyleSheet!);
                                                    }

                                                    this._adoptedCssStyleSheet!.push(aspectCssStyleSheet!);

                                                    const ownCssStyleSheetUsageCount = Aspects._adoptedCssStyleSheetsTracker.get(aspectCssStyleSheet!);
                                                    Aspects._adoptedCssStyleSheetsTracker.set(aspectCssStyleSheet!, 
                                                                                            (Helpers.isNumber(ownCssStyleSheetUsageCount) 
                                                                                                        ? ownCssStyleSheetUsageCount! 
                                                                                                        : 0) + 1);
                                                }

                                                //handle adopted styles
                                                if (Helpers.isArray(adoptedStyleNames)) {
                                                    for (const el of adoptedStyleNames!) {
                                                        Environment.adoptedStyles.tryPrepare(el, () => {
                                                            const adoptedCssStyleSheet = Environment.adoptedStyles.get(el);
                                                            if (!Helpers.isUndefined(adoptedCssStyleSheet) && (root!.adoptedStyleSheets.indexOf(adoptedCssStyleSheet!) < 0)) {
                                                                root!.adoptedStyleSheets.push(adoptedCssStyleSheet!);
                                                            }

                                                            this._adoptedCssStyleSheet!.push(adoptedCssStyleSheet!);

                                                            const adoptedCssStyleSheetUsageCount = Aspects._adoptedCssStyleSheetsTracker.get(adoptedCssStyleSheet!);
                                                            Aspects._adoptedCssStyleSheetsTracker.set(adoptedCssStyleSheet!,
                                                                                                    (Helpers.isNumber(adoptedCssStyleSheetUsageCount) 
                                                                                                                ? adoptedCssStyleSheetUsageCount! 
                                                                                                                : 0) + 1);
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        } else {
                            Console.error(nativeElement, `aspect with '${aspectName}' name cannot be constructed.`);
                        }
                    } else {
                        Console.error(nativeElement, `aspect with '${aspectName}' name not found`);
                    }  
                } else {
                    Console.error(nativeElement, `aspect name can't be empty`);
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
            for (const [key, value] of this.nExpression!) {
                if (!Helpers.isUndefined(value.nExpression)) {
                    this.processExpressionExecution(value.nExpression!, `${Constants.ASPECT_HANDLER_PREFIX_NAME}:${key}`,
                                                    expression => executeExpression(expression, executionParams), 
                                                    data => this.set(key, data));
                }
            }
        }

        return executionParams;
    }
    
    public commit(): boolean {
        const wasDirty = this._isDirty;

        if (this._isDirty) {
            for (const [key, value] of this.nExpression!) {
                if (!Helpers.equals(value.aspect.data, value.data)) {
                    value.aspect.data = value.data;
                }
            }

            this._isDirty = false;
        }

        return wasDirty;
    }

    protected set(aspectKey: string, data: any): void {
        this.nExpression!.get(aspectKey)!.data = data;
        this._isDirty = true;
    }

    public dispose(): void {
        if (this.hasNExpression && 
            !Helpers.isUndefined(this._adoptedStylesRoot) && Helpers.isArray(this._adoptedCssStyleSheet) && (this._adoptedCssStyleSheet!.length > 0)) {
            for (const adoptedCssStyleSheet of this._adoptedCssStyleSheet!) {
                const adoptedCssStyleSheetUsageCount = Aspects._adoptedCssStyleSheetsTracker.get(adoptedCssStyleSheet);
                if (Helpers.isNumber(adoptedCssStyleSheetUsageCount)) {
                    if (adoptedCssStyleSheetUsageCount! > 1) {
                        Aspects._adoptedCssStyleSheetsTracker.set(adoptedCssStyleSheet!, adoptedCssStyleSheetUsageCount! - 1);
                    } else {
                        Aspects._adoptedCssStyleSheetsTracker.delete(adoptedCssStyleSheet);
                        const adoptedCssStyleSheetIndex = this._adoptedStylesRoot!.adoptedStyleSheets.indexOf(adoptedCssStyleSheet);
                        if (adoptedCssStyleSheetIndex >= 0) {
                            this._adoptedStylesRoot!.adoptedStyleSheets.splice(adoptedCssStyleSheetIndex, 1);
                        }
                    }
                }
            }

            this._isDisposed = true;

            delete this._adoptedStylesRoot;
            delete this._adoptedCssStyleSheet;
        }
    }
}