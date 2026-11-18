import { INElement } from '../../interfaces/nElement/INElement';

import { IElementManipulationsConsumer } from '../../interfaces/nElement/IElementManipulationsConsumer';
import { IElementSubscriptionsConsumer } from '../../interfaces/nElement/IElementSubscriptionsConsumer';

import { ContextedBase } from './base/ContextedBase';

import { Attributes } from './Attributes';

import { Environment } from '../../Environment';

import { IComponentContext } from '../../interfaces/contexts/IComponentContext';

import { IContextBinder } from '../../interfaces/contextBinders/IContextBinder';
import { IBindableContextBinder } from '../../interfaces/contextBinders/IBindableContextBinder';

import { ChangeDetector } from '../../models/injections/ChangeDetector';
import { ElementManipulations } from '../../models/injections/ElementManipulations';
import { ElementSubscriptions } from '../../models/injections/ElementSubscriptions';
import { EventDispatcher } from '../../models/injections/EventDispatcher';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class ComponentContextEntityData {
    public readonly context: IComponentContext;
    public readonly contextBinder: IBindableContextBinder;

    constructor(context: IComponentContext, contextBinder: IBindableContextBinder) {
        this.context = context;
        this.contextBinder = contextBinder;
    }
}

export class Component extends ContextedBase<ComponentContextEntityData> implements IElementManipulationsConsumer, IElementSubscriptionsConsumer {
    private readonly _getEventDispatcher: (() => EventDispatcher) | undefined;

    private readonly _getElementManipulations: (() => ElementManipulations) | undefined;
    private readonly _getElementSubscriptions: (() => ElementSubscriptions) | undefined;

    private _isFirstComponentCommit = true;

    private _previousComponentName = '';
    private _currentComponentName = '';

    public readonly hasElementManipulations: boolean;
    public readonly hasElementSubscriptions: boolean;

    constructor(nativeElement: Element, attributes: Attributes,
                parentContextBinder: IContextBinder, parentNElement: INElement,
                getElementManipulations: () => ElementManipulations, getElementSubscriptions: () => ElementSubscriptions, 
                getEventDispatcher: () => EventDispatcher) {
        super(Environment.components.has(nativeElement.tagName) ? `@${nativeElement.tagName.toLowerCase()}` : undefined,
              nativeElement, attributes, parentContextBinder, parentNElement,
              Constants.HANDLERS.COMPONENT_MARKER_ATTRIBUTE_NAME,
              false);

        if (this.hasNExpression) {
            this._getEventDispatcher = getEventDispatcher;

            this._currentComponentName = nativeElement.tagName.toLowerCase();
            this.isEntityDataDirty = true;

            const dependencies = Environment.components.getDependencies(this._currentComponentName);
            if (!Helpers.isUndefined(dependencies)) {
                this.hasElementManipulations = dependencies!.has(ElementManipulations);
                this.hasElementSubscriptions = dependencies!.has(ElementSubscriptions);

                if (this.hasElementManipulations) {
                    this._getElementManipulations = getElementManipulations;
                }

                if (this.hasElementSubscriptions) {
                     this._getElementSubscriptions = getElementSubscriptions;
                }
            } else {
                this.hasElementManipulations = false;
                this.hasElementSubscriptions = false;
            }
        } else {
            this.hasElementManipulations = false;
            this.hasElementSubscriptions = false;
        }
    }
    
    public onCommit(entityData: ComponentContextEntityData | null | undefined): ComponentContextEntityData | null | undefined {
        let result: ComponentContextEntityData | null | undefined;
        
        if (Helpers.isNotEmptyString(this._currentComponentName)) {
            if (this._previousComponentName !== this._currentComponentName) {
                if (this._isFirstComponentCommit) {
                    this._isFirstComponentCommit = false;
                    this.markAsReady();
                } else {
                    this.disposeInternal(false);
                }

                if (Environment.components.isReady(this._currentComponentName)) {
                    const contextBinder = Environment.components.instantiateBinder(this._currentComponentName, this.parentContextBinder!, this.parentNElement!);
                    if (!Helpers.isUndefined(contextBinder)) {
                        try {
                            const context = Environment.components.instantiateContext(this._currentComponentName, 
                                                                                      this.nativeElement!,
                                                                                      new ChangeDetector(() => contextBinder!.detectChanges()),
                                                                                      this._getElementManipulations?.(),
                                                                                      this._getElementSubscriptions?.(),
                                                                                      this._getEventDispatcher!());
                            if (!Helpers.isUndefined(context)) {
                                result = new ComponentContextEntityData(context!, contextBinder!);                    
                                this._previousComponentName = this._currentComponentName;
                            } else {
                                contextBinder!.dispose();
                            }
                        } catch (ex) {
                            contextBinder!.dispose();
                            throw ex;
                        }
                    } else {
                        this.disposeInternal(true);
                        Console.error(this.nativeElement, `invalid operation: Component '${this.nativeElement!.tagName}' meta data is not found.`);
                    }
                } else {
                    if (Environment.components.tryPrepare(this._currentComponentName, () => {
                        this.isEntityDataDirty = true;
                        this.commit!();
                    })) {
                        result = null;
                    } else {
                        this.disposeInternal(true);
                        Console.error(this.nativeElement, `invalid operation: Component '${this.nativeElement!.tagName}' meta data is not found.`);
                    }
                }
            } else {
                result = entityData;
            }
        } else {
            this.disposeInternal(true);
        }

        return result;
    }

    protected onEntityDataChange(entityData: ComponentContextEntityData): IContextBinder {
        (<Element & { $bind: (contextBinder: IBindableContextBinder, context: IComponentContext, 
                              hasInputs: boolean) => void }>this.nativeElement!).$bind(entityData.contextBinder, entityData.context, 
                                                                                       this.nExpression!.hasNInExpression);
        
        return entityData.contextBinder;
    }

    protected onDispose(): void {
        this.disposeInternal(true);
    }

    //clean up
    private disposeInternal(full: boolean): void {
        if (full) {
            this._previousComponentName = '';
            this._currentComponentName = '';
        }
    }

    public static isNApplicable(nativeElement: Element): boolean {
        return Environment.components.has(nativeElement.tagName);
    }
}