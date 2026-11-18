import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';
import { IAspectContext } from '../../interfaces/contexts/IAspectContext';
import { IAspectBindings } from '../../interfaces/nElement/bindings/IAspectBindings';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IElementManipulationsConsumer } from '../../interfaces/nElement/IElementManipulationsConsumer';
import { IElementSubscriptionsConsumer } from '../../interfaces/nElement/IElementSubscriptionsConsumer';
import { IDisposable } from '../../interfaces/IDisposable';

import { IContextBinder } from '../../interfaces/contextBinders/IContextBinder';

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

export class Aspects extends Base implements IHandler<Map<string, IAspectBindings>>, IElementManipulationsConsumer, IElementSubscriptionsConsumer, IDisposable {
    private static readonly _adoptedCssStyleSheetsTracker = new Map<Document | ShadowRoot, Map<CSSStyleSheet, number>>();

    private _isDisposed = false;

    private _adoptedStylesRoot: Document | ShadowRoot | undefined;
    private _adoptedCssStyleSheet: Array<CSSStyleSheet> | undefined;

    public readonly hasElementManipulations: boolean;
    public readonly hasElementSubscriptions: boolean;

    public readonly nExpression: Map<string, IAspectBindings> | undefined;
    public readonly hasNExpression: boolean;

    private _isDirty = false;
    public get isDirty(): boolean {
        return this._isDirty;
    }

    constructor(nativeElement: Element, attributes: Attributes,
                contextBinder: IContextBinder,
                getElementManipulations: () => ElementManipulations, getElementSubscriptions: () => ElementSubscriptions, 
                getEventDispatcher: () => EventDispatcher) {
        super();
        
        if (attributes.has(Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME, true, true)) {
            this.hasNExpression = true;
            this.nExpression = new Map<string, IAspectBindings>();
            
            const handlerNameWithMeta = Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME + Constants.META_VALUE_SEPARATOR;

            let root: Document | ShadowRoot | undefined;
            let hasElementManipulations = false;
            let hasElementSubscriptions = false;

            for (const [key, value] of attributes.getAll(Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME, true)) {
                const aspectName = key.replace(handlerNameWithMeta, '');
                if (aspectName.length > 0) {
                    if (Environment.aspects.has(aspectName)) {//TODO: consider migration to bind or commit and on first bind\commit construct aspect
                        if (!this.nExpression!.has(aspectName)) {
                            if (!hasElementManipulations || !hasElementSubscriptions ) {
                                const dependencies = Environment.aspects.getDependencies(aspectName);
                                if (!Helpers.isUndefined(dependencies)) {
                                    hasElementManipulations = hasElementManipulations || dependencies!.has(ElementManipulations);
                                    hasElementSubscriptions = hasElementSubscriptions || dependencies!.has(ElementSubscriptions);
                                }
                            }

                            const aspectMetaData = Environment.aspects.instantiate(aspectName, nativeElement, 
                                                                                   new ChangeDetector(() => contextBinder.detectChanges()),
                                                                                   getElementManipulations(),
                                                                                   getElementSubscriptions(), 
                                                                                   getEventDispatcher());
                            if (!Helpers.isUndefined(aspectMetaData)) {
                                const [aspect, hasStyles] = aspectMetaData!;
                                this.nExpression!.set(aspectName, new AspectBindings(Helpers.isNotEmptyString(value) ? ExpressionDetails.create(value!) : undefined, 
                                                                                     <IAspectContext>aspect));

                                if (hasStyles) {
                                    Environment.aspects.tryPrepare(aspectName, asyncCallBack => {
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

                                                    let adoptedCssStyleSheetsTracker = Aspects._adoptedCssStyleSheetsTracker.get(root!);
                                                    if (Helpers.isUndefined(adoptedCssStyleSheetsTracker)) {
                                                        adoptedCssStyleSheetsTracker = new Map<CSSStyleSheet, number>();
                                                        Aspects._adoptedCssStyleSheetsTracker.set(root!, adoptedCssStyleSheetsTracker);
                                                    }

                                                    //handle own styles (aspectCssStyleSheet)
                                                    if (!Helpers.isUndefined(aspectCssStyleSheet)) {
                                                        if (root!.adoptedStyleSheets.indexOf(aspectCssStyleSheet!) < 0) {
                                                            root!.adoptedStyleSheets.push(aspectCssStyleSheet!);
                                                        }

                                                        this._adoptedCssStyleSheet!.push(aspectCssStyleSheet!);

                                                        const ownCssStyleSheetUsageCount = adoptedCssStyleSheetsTracker!.get(aspectCssStyleSheet!);
                                                        adoptedCssStyleSheetsTracker!.set(aspectCssStyleSheet!, 
                                                                                          (Helpers.isNumber(ownCssStyleSheetUsageCount) 
                                                                                                ? ownCssStyleSheetUsageCount! 
                                                                                                : 0) + 1);
                                                    }

                                                    //handle adopted styles
                                                    if (Helpers.isArray(adoptedStyleNames)) {
                                                        const adoptedStyleSheets = new Map<string, CSSStyleSheet | undefined>();
                                                        const tryPushAdoptedStyleSheets = () => { 
                                                            if (adoptedStyleNames!.length == adoptedStyleSheets.size) {
                                                                for (const el of adoptedStyleNames!) {
                                                                    const adoptedCssStyleSheet = adoptedStyleSheets.get(el);
                                                                    if (!Helpers.isUndefined(adoptedCssStyleSheet)) {
                                                                        if (root!.adoptedStyleSheets.indexOf(adoptedCssStyleSheet!) < 0) {
                                                                            root!.adoptedStyleSheets.push(adoptedCssStyleSheet!);
                                                                        }

                                                                        this._adoptedCssStyleSheet!.push(adoptedCssStyleSheet!);

                                                                        const adoptedCssStyleSheetUsageCount = adoptedCssStyleSheetsTracker!.get(adoptedCssStyleSheet!);
                                                                        adoptedCssStyleSheetsTracker!.set(adoptedCssStyleSheet!,
                                                                                                          (Helpers.isNumber(adoptedCssStyleSheetUsageCount) 
                                                                                                                    ? adoptedCssStyleSheetUsageCount! 
                                                                                                                    : 0) + 1);
                                                                    }
                                                                }
                                                            }
                                                        };

                                                        for (const el of adoptedStyleNames!) {
                                                            const prepareRequestResult = Environment.adoptedStyles.tryPrepare(el, asyncCallBack => {
                                                                adoptedStyleSheets.set(el, Environment.adoptedStyles.get(el));
                                                                tryPushAdoptedStyleSheets();
                                                            });

                                                            if (!prepareRequestResult) {
                                                                adoptedStyleSheets.set(el, undefined);
                                                                tryPushAdoptedStyleSheets();

                                                                Console.error(nativeElement, `unable to get ${el} adoptedStyle for aspect with '${aspectName}' name.`);
                                                            }
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
                            Console.error(nativeElement, `multiple handlers for one aspect (${aspectName}) are not supported`);
                        }
                    } else {
                        Console.error(nativeElement, `aspect with '${aspectName}' name not found`);
                    }  
                } else {
                    Console.error(nativeElement, `aspect name can't be empty`);
                }
            }

            this.hasElementManipulations = hasElementManipulations;
            this.hasElementSubscriptions = hasElementSubscriptions;
        } else {
            this.hasNExpression = false;
            this.hasElementManipulations = false;
            this.hasElementSubscriptions = false;
        }
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (this.hasNExpression) {
            for (const [key, value] of this.nExpression!) {
                if (!Helpers.isUndefined(value.nExpression)) {
                    this.processExpressionExecution(value.nExpression!, `${Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME}:${key}`,
                                                    expression => executeExpression(expression, executionParams), 
                                                    data => this.set(key, data));
                }
            }
        }

        return executionParams;
    }
    
    public commit(): boolean {
        let wasDirty = false;

        if (this._isDirty) {
            for (const [key, value] of this.nExpression!) {
                if (!Helpers.equals(value.aspect.data, value.data)) {
                    value.aspect.data = value.data;
                    wasDirty = true;
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
        if (this.hasNExpression) {
            this._isDisposed = true;

            try {
                if (!Helpers.isUndefined(this._adoptedStylesRoot) && 
                    (Helpers.isArray(this._adoptedCssStyleSheet) && (this._adoptedCssStyleSheet!.length > 0))) {
                    const adoptedCssStyleSheetsTracker = Aspects._adoptedCssStyleSheetsTracker.get(this._adoptedStylesRoot!);
                    if (!Helpers.isUndefined(adoptedCssStyleSheetsTracker)) {
                        for (const adoptedCssStyleSheet of this._adoptedCssStyleSheet!) {
                            const adoptedCssStyleSheetUsageCount = adoptedCssStyleSheetsTracker!.get(adoptedCssStyleSheet);
                            if (Helpers.isNumber(adoptedCssStyleSheetUsageCount)) {
                                if (adoptedCssStyleSheetUsageCount! > 1) {
                                    adoptedCssStyleSheetsTracker!.set(adoptedCssStyleSheet!, adoptedCssStyleSheetUsageCount! - 1);
                                } else {
                                    adoptedCssStyleSheetsTracker!.delete(adoptedCssStyleSheet);
                                    const adoptedCssStyleSheetIndex = this._adoptedStylesRoot!.adoptedStyleSheets.indexOf(adoptedCssStyleSheet);
                                    if (adoptedCssStyleSheetIndex >= 0) {
                                        this._adoptedStylesRoot!.adoptedStyleSheets.splice(adoptedCssStyleSheetIndex, 1);
                                    }
                                }
                            }
                        }

                        if (adoptedCssStyleSheetsTracker!.size == 0) {
                            Aspects._adoptedCssStyleSheetsTracker.delete(this._adoptedStylesRoot!);
                        }
                    }
                }

                this._adoptedStylesRoot = undefined;
                this._adoptedCssStyleSheet = undefined;
            } finally {
                const disposeErrors: Array<string> = [];
                
                for (const [key, value] of this.nExpression!) {
                    if (Helpers.isFunction(value.aspect.onDispose)) {
                        try {
                            value.aspect.onDispose!();
                        } catch (ex) {
                            disposeErrors.push(`aspect ${key} context dispose failed with exception: ${ex}`);
                        }
                    }
                }

                if (disposeErrors.length > 0) {
                    throw new Error(`one or more aspect context dispose failed: ${disposeErrors.join(',')}`);
                }
            }
        }
    }
}