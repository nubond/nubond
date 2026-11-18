import { INElement } from '../../interfaces/nElement/INElement';

import { ContextedBase } from './base/ContextedBase';

import { NElementProjection } from '../NElementProjection';

import { Attributes } from './Attributes';

import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { TemplateEntityBinderData } from '../../entities/Containers';

import { Environment } from '../../Environment';

import { IContext } from '../../interfaces/contexts/IContext';
import { IContextBinder } from '../../interfaces/contextBinders/IContextBinder';

import { ChangeDetector } from '../../models/injections/ChangeDetector';
import { EventDispatcher } from '../../models/injections/EventDispatcher';

import { Helpers } from '../../Helpers';
import { Constants } from '../../Constants';
import { Console } from '../../Console';

class TemplateEntityContextData {
    public readonly context: IContext;
    public readonly contextBinderData: TemplateEntityBinderData;

    constructor(context: IContext, contextBinderData: TemplateEntityBinderData) {
        this.context = context;
        this.contextBinderData = contextBinderData;
    }
}

export class Container extends ContextedBase<TemplateEntityContextData> {

    private readonly _getEventDispatcher: (() => EventDispatcher) | undefined;
    private readonly _constructSubTree: (() => void) | undefined;
    private readonly _removeChildren: (() => void) | undefined;

    private readonly _associatedRouteSlot: string | undefined;

    private readonly _nElementProjection: NElementProjection | undefined;

    private readonly _unSubscribeFromRouteOnStateChanged: (() => void) | undefined;

    private _isFirstContainerCommit = true;

    private _previousContextName = '';
    private _currentContextName = '';

    constructor(nativeElement: Element, attributes: Attributes,
                parentContextBinder: IContextBinder, parentNElement: INElement,
                getEventDispatcher: () => EventDispatcher,
                constructSubTree: () => void,
                removeChildren: () => void) {
        let expression = <string | undefined>attributes.get(Constants.HANDLERS.CONTAINER_HANDLER_ATTRIBUTE_NAME, true);
        let associatedRouteSlot: string | undefined;

        if (Helpers.isString(expression) && expression!.startsWith('%')) {
            associatedRouteSlot = expression!.substring(1).trim();
            expression = `@${associatedRouteSlot}`;
        }

        super(expression, 
              nativeElement, attributes, parentContextBinder, parentNElement,
              Constants.HANDLERS.CONTAINER_HANDLER_ATTRIBUTE_NAME,
              true);
        
        if (this.hasNExpression) {
            this._getEventDispatcher = getEventDispatcher;
            this._constructSubTree = constructSubTree;
            this._removeChildren = removeChildren;

            if (Helpers.isString(associatedRouteSlot)) {
                this._associatedRouteSlot = associatedRouteSlot;

                if (!Helpers.isUndefined(Environment.router) && Environment.router!.isConfigured) {
                    this.setContextDataFromRoute();

                    this._unSubscribeFromRouteOnStateChanged = Environment.router!.onAfterStateChange(() => {
                        this.setContextDataFromRoute();
                        this.parentContextBinder!.detectChanges();
                    });
                } else {
                    Console.error(nativeElement, 'container is mapped to route, that is not configured.');
                }
            }

            this._nElementProjection = new NElementProjection(nativeElement);
        }
    }
    
    public onBind(executionParams: ExecutionParams | undefined,
                  executeExpression: (expression: string | null | undefined, 
                                      executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        if (Helpers.isUndefined(this._associatedRouteSlot)) {
            this.processExpressionExecution(this.nExpression!.nExpression, Constants.HANDLERS.CONTAINER_HANDLER_ATTRIBUTE_NAME, 
                                            expression => executeExpression(expression, executionParams), 
                                            data => this.setContextData(Helpers.stringify(data)));
        }

        return executionParams;
    }
    
    public onCommit(entityData: TemplateEntityContextData | null | undefined): TemplateEntityContextData | null | undefined {
        let result: TemplateEntityContextData | null | undefined;

        if (Helpers.isNotEmptyString(this._currentContextName)) {
            if (this._previousContextName !== this._currentContextName) {
                if (this._isFirstContainerCommit) {
                    this._isFirstContainerCommit = false;
                    this.markAsReady();
                } else {
                    this.disposeInternal(false);
                }

                if (Environment.containers.has(this._currentContextName)) {
                    if (Environment.containers.isReady(this._currentContextName)) {
                        const contextBinderData = Environment.containers.instantiateBinder(this._currentContextName, this.parentContextBinder!, this.parentNElement!);
                        if (!Helpers.isUndefined(contextBinderData)) {
                            try {
                                const context = Environment.containers.instantiateContext(this._currentContextName,
                                                                                          new ChangeDetector(() => contextBinderData!.contextBinder!.detectChanges()),
                                                                                          this._getEventDispatcher!());
                                if (!Helpers.isUndefined(context)) {
                                    result = new TemplateEntityContextData(context!, contextBinderData!);                    
                                    this._previousContextName = this._currentContextName;
                                } else {
                                    contextBinderData!.contextBinder.dispose();
                                }
                            } catch (ex) {
                                contextBinderData!.contextBinder.dispose();
                                throw ex;
                            }
                        } else {
                            this._previousContextName = this._currentContextName;
                            Console.error(this.nativeElement, `invalid operation: Container '${this._currentContextName}' meta data is not found or container is not ready.`);
                        }
                    } else {
                        if (Environment.containers.tryPrepare(this._currentContextName, () => {
                            this.isEntityDataDirty = true;
                            this.commit!();
                        })) {
                            result = null;
                        } else {
                            this._previousContextName = this._currentContextName;
                            this.disposeInternal(false);
                            this.fallbackView();
                            Console.error(this.nativeElement, `invalid operation: Container with name '${this._currentContextName}' is unable to get HTML template.`);
                        }
                    }
                } else {
                    this._previousContextName = this._currentContextName;
                    this.disposeInternal(false);
                    this.fallbackView();
                    Console.error(this.nativeElement, `invalid operation: Container with name '${this._currentContextName}' not found.`);
                }
            } else {
                result = entityData;
            }
        } else {
            if (this._isFirstContainerCommit) {
                this._isFirstContainerCommit = false;
                this.markAsReady();
                this.fallbackView();
            }

            if (this._previousContextName !== this._currentContextName) {
                this.disposeInternal(true);
                this.fallbackView();
            }
        }

        return result;
    }

    protected onEntityDataChange(entityData: TemplateEntityContextData): IContextBinder {
        this.nativeElement!.replaceChildren(...Array.from(entityData.contextBinderData.template.childNodes));
        this._nElementProjection!.project();

        entityData.contextBinderData.contextBinder.bind(this.nativeElement!, entityData.context, false,
                                                        this.nExpression!.hasNInExpression);

        return entityData.contextBinderData.contextBinder;
    }

    protected onDispose(): void {
        if (Helpers.isFunction(this._unSubscribeFromRouteOnStateChanged)) {
            this._unSubscribeFromRouteOnStateChanged!();
        }

        this.disposeInternal(true);
    }

    protected setContextData(contextName: string): void {
        this._currentContextName = contextName.toLowerCase();
        this.isEntityDataDirty = true;
    }

    protected setContextDataFromRoute(): void {
        const contextName = Helpers.isObject(Environment.router!.state)
                                    ? Environment.router!.state![this._associatedRouteSlot!]
                                    : null;
        this.setContextData(Helpers.isString(contextName) ? contextName! : '');
    }

    //clean up
    protected fallbackView(): void {
        const fallbackExists = this._nElementProjection!.fallback();

        if (fallbackExists) {
            this._constructSubTree!();
            this.parentContextBinder!.detectChanges();
        } else {
            let child = this.nativeElement!.firstChild;
            while (child !== null) {
                child.remove();
                child = this.nativeElement!.firstChild;
            }
        }
    }

    private disposeInternal(full: boolean): void {
        if (full) {
            this._previousContextName = '';
            this._currentContextName = '';
        }

        this._removeChildren!();
    }
}