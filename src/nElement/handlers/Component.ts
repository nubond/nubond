import { ContextedBase } from './base/ContextedBase';

import { Attributes } from './Attributes';

import { Environment } from '../../Environment';

import { IComponentContext } from '../../interfaces/contexts/IComponentContext';
import { IContextBinder, ContextBinder } from '../../ContextBinder';

import { ChangeDetector } from '../../models/injections/ChangeDetector';
import { ElementManipulations } from '../../models/injections/ElementManipulations';
import { ElementSubscriptions } from '../../models/injections/ElementSubscriptions';
import { EventDispatcher } from '../../models/injections/EventDispatcher';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class ComponentContextEntityData {
    public readonly context: IComponentContext;
    public readonly contextBinder: ContextBinder;

    constructor(context: IComponentContext, contextBinder: ContextBinder) {
        this.context = context;
        this.contextBinder = contextBinder;
    }
}

export class Component extends ContextedBase<ComponentContextEntityData> {
    private readonly _getElementManipulations: (() => ElementManipulations) | undefined;
    private readonly _getElementSubscriptions: (() => ElementSubscriptions) | undefined;
    private readonly _getEventDispatcher: (() => EventDispatcher) | undefined;

    private _isFirstComponentCommit = true;

    private _previousComponentName = '';
    private _currentComponentName = '';

    constructor(nativeElement: Element, attributes: Attributes, 
                getElementManipulations: () => ElementManipulations, getElementSubscriptions: () => ElementSubscriptions, getEventDispatcher: () => EventDispatcher,
                isElementVisible: () => boolean) {
        super(Environment.components.has(nativeElement.tagName) ? `@${nativeElement.tagName.toLowerCase()}` : undefined,
              nativeElement, attributes, 
              isElementVisible);

        if (this.hasNExpression) {
            this._currentComponentName = nativeElement.tagName.toLowerCase();
            this._getElementManipulations = getElementManipulations;
            this._getElementSubscriptions = getElementSubscriptions;
            this._getEventDispatcher = getEventDispatcher;
            this.isEntityDataDirty = true;
        }
    }
    
    public onCommit(entityData: ComponentContextEntityData | null | undefined): ComponentContextEntityData | null | undefined {
        let result: ComponentContextEntityData | null | undefined;
        
        if (Helpers.isNotEmptyString(this._currentComponentName)) {
            if (this._previousComponentName !== this._currentComponentName) {
                if (this._isFirstComponentCommit) {
                    this._isFirstComponentCommit = false;
                    this.attributes!.markAsReady(Constants.COMPONENT_MARKER_ATTRIBUTE_NAME);
                } else {
                    this.disposeInternal(false);
                }

                if (Environment.components.isReady(this._currentComponentName)) {
                    const contextBinder = Environment.components.instantiateBinder(this._currentComponentName);
                    if (!Helpers.isUndefined(contextBinder)) {
                        const context = Environment.components.instantiateContext(this._currentComponentName, 
                                                                                  this.nativeElement!,
                                                                                  new ChangeDetector(() => contextBinder!.detectChanges()),
                                                                                  this._getElementManipulations!(),
                                                                                  this._getElementSubscriptions!(),
                                                                                  this._getEventDispatcher!());   
                        result = new ComponentContextEntityData(context!, contextBinder!);                    
                        this._previousComponentName = this._currentComponentName;
                    } else {
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
        (<Element & { $bind: (contextBinder: ContextBinder, context: IComponentContext, 
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
        return (nativeElement.nodeType === Node.ELEMENT_NODE) && Environment.components.has(nativeElement.tagName);
    }
}