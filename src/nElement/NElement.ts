import { INElement, INTreeElement } from '../interfaces/nElement/INElement';
import { IVisible } from '../interfaces/nElement/IVisible';

import { IConstructable } from '../interfaces/nElement/IConstructable';
import { ICommittable } from '../interfaces/nElement/ICommittable';
import { IBindable } from '../interfaces/nElement/IBindable';
import { IDisposable } from '../interfaces/IDisposable';

import { IContextBinder } from '../interfaces/contextBinders/IContextBinder';

import { CallBackEvent } from '../CallBackEvent'; 

import { ExecutionParams } from '../expression/ExpressionExecParamsHelper';

import { Html } from './handlers/Html';
import { Value } from './handlers/Value';
import { Classes } from './handlers/Classes';
import { Styles } from './handlers/Styles';
import { Attributes } from './handlers/Attributes';
import { If } from './handlers/If';
import { Events } from './handlers/Events';
import { Repeat } from './handlers/Repeat';
import { Container } from './handlers/Container';
import { Properties } from './handlers/Properties';
import { Exec } from './handlers/Exec';
import { Switch } from './handlers/switch/Switch';
import { Case } from './handlers/switch/Case';
import { Default } from './handlers/switch/Default';
import { Aspects } from './handlers/Aspects';
import { Component } from './handlers/Component';
import { Template } from './handlers/Template';
import { Bound } from './handlers/Bound';
import { Variables } from './handlers/Variables';
import { Projection } from './handlers/Projection';

import { EventDispatcher } from '../models/injections/EventDispatcher';
import { ElementSubscriptions } from '../models/injections/ElementSubscriptions';
import { ElementManipulations, 
         ElementPropertiesManipulations, ElementAttributesManipulations,
         ElementStylesManipulations, ElementClassesManipulations } from '../models/injections/ElementManipulations';

import { Helpers } from '../Helpers';
import { Console  } from '../Console';
import { Constants } from '../Constants';

export class NTreeElement implements INTreeElement {
    private static readonly EMPTY_ARRAY = <Array<INTreeElement>>Object.freeze(new Array<INTreeElement>(0));

    private _onDisposeCallBackEvent: CallBackEvent<() => void> | undefined;

    private _childrenToRemove: Array<INTreeElement> | undefined;
    protected children: Array<INTreeElement> = NTreeElement.EMPTY_ARRAY;

    public readonly isSubTreeHandled: boolean = false;

    protected _isStable = true;
    public get isStable(): boolean {
        return this._isStable && this.children.every(el => el.isStable);
    }

    public get isVisible(): boolean {
        return true;
    }

    public readonly nativeElement: Element;

    constructor (nativeElement: Element) {
        this.nativeElement = nativeElement;
    }

    public addChild(nElement: INTreeElement): void {
        if (this.children === NTreeElement.EMPTY_ARRAY) {
            this.children = [nElement];
        } else {
            this.children.push(nElement);
        }
    }

    public removeChild(nElement: INTreeElement, debounced: boolean = true): void {
        if (debounced) {
            if (!Helpers.isUndefined(this._childrenToRemove)) {
                this._childrenToRemove!.push(nElement);
            } else {
                this._childrenToRemove = [nElement];
            }
        } else {
            const index = this.children.indexOf(nElement);
            if (index >= 0) {
                this.children.splice(index, 1);
            }
        }
    }

    public detectChanges(context: object, executionParams?: ExecutionParams): void {
        for (const el of this.children) {
            el.detectChanges(context, executionParams);
        }

        this.stabilizeChildren();
    }

    public dispose(): void {
        if (!Helpers.isUndefined(this._onDisposeCallBackEvent)) {
            try {
                this._onDisposeCallBackEvent!.raise();
            } catch(ex) {
                Console.error(this.nativeElement, `onDispose call back execution error: ${ex}`);
            }
        }

        for (const el of this.children) {
            el.dispose();
        }
    }

    public onDispose(callBack: () => void): () => void {
        if (Helpers.isUndefined(this._onDisposeCallBackEvent)) {
            this._onDisposeCallBackEvent = new CallBackEvent<() => void>();
        }

        return this._onDisposeCallBackEvent!.subscribe(callBack);
    }

    protected removeAndStabilizeChildren(): void {
        if (this.children !== NTreeElement.EMPTY_ARRAY) {
            this.children.length = 0;
        }
        this._childrenToRemove = undefined;
    }

    protected stabilizeChildren() {
        while (this._childrenToRemove?.length ?? 0 > 0) {
            const expectedIndex = this.children.indexOf(this._childrenToRemove!.pop()!);
            if (expectedIndex >= 0) {
                this.children.splice(expectedIndex, 1);
            }
        }
    }
}

export class NElement extends NTreeElement implements INElement {
    private readonly _contextBinder: IContextBinder;

    private readonly _clone: ((contextBinder: IContextBinder, nElementsParent: INElement | INTreeElement, nElement: INElement) => void) | undefined;
    
    private readonly _bindSequenceInvisibleParentHandled: Array<IBindable> | undefined;
    private readonly _commitSequenceInvisibleParentHandled: Array<ICommittable> | undefined;

    private readonly _bindSequenceSoftRemovers: Array<IBindable> | undefined;
    private readonly _commitSequenceSoftRemovers: Array<ICommittable> | undefined;

    private readonly _bindSequence: Array<IBindable> | undefined;
    private readonly _commitSequence: Array<ICommittable> | undefined;
    private readonly _disposeSequence: Array<IDisposable> | undefined;

    private _removed = false;
    private _isDisposed = false;

    //handlers that are handles in parents but changing child visibility
    private readonly _visibleParentHandlers: Array<IVisible> | undefined;
    private get _isVisibleParentHandled(): boolean {
        return Helpers.isUndefined(this._visibleParentHandlers) || !this._visibleParentHandlers!.some(el => !el.isVisible);
    }

    private readonly _visibilityHandlers: Array<IVisible> | undefined;
    public get isVisible(): boolean {
        return this._isVisibleParentHandled &&
               (Helpers.isUndefined(this._visibilityHandlers) || !this._visibilityHandlers!.some(el => !el.isVisible));
    }

    private _eventDispatcher: EventDispatcher | undefined;
    private _elementSubscriptions: ElementSubscriptions | undefined;
    private _elementManipulations: ElementManipulations | undefined;

    public readonly nativeElementForClone: Node | undefined;
    public readonly parent: INElement | INTreeElement | null;
    public readonly immediateParent: INElement | undefined;

    public readonly repeat: Repeat | undefined;
    public readonly switch: Switch | undefined;

    public readonly isSubTreeHandled: boolean;

    constructor (contextBinder: IContextBinder, parent: INElement | INTreeElement | null, nativeElement: Element, 
                 cloneOf: INElement | undefined, immediateParent: INElement | undefined,
                 clone: (contextBinder: IContextBinder, nTreeElementParent: INElement | INTreeElement, nElement: INElement) => void,
                 constructSubTree: (contextBinder: IContextBinder, nTreeElementParent: INElement) => void) {
        super(nativeElement);

        this._contextBinder = contextBinder;
        this.parent = parent;
        this.immediateParent = immediateParent ?? cloneOf?.immediateParent;

        //handlers creation
        const attributes = new Attributes(this.nativeElement, this._contextBinder.showDebugInfo);
        const properties = new Properties(this.nativeElement, attributes);

        const classes = new Classes(this.nativeElement, attributes);
        const styles = new Styles(this.nativeElement, attributes);

        const value = new Value(this.nativeElement, attributes);
        const html = new Html(this.nativeElement, attributes,
                              contextBinder.htmlSanitizer);

        const events = new Events(this.nativeElement, attributes, this._contextBinder,
                                  this.getManipulationProxyCreator(properties, attributes, styles, classes));
        const exec = new Exec(attributes);

        const if_ = new If(this.nativeElement, attributes, classes);
        const switch_ = new Switch(this.nativeElement, attributes, classes);
        const case_ = new Case(this.nativeElement, attributes, classes, (<INElement>parent)?.switch);
        const default_ = new Default(this.nativeElement, attributes, classes, (<INElement>parent)?.switch);

        const repeat = new Repeat(this.nativeElement, attributes, classes, this,
                                  cloneOf?.repeat,
                                  this._contextBinder.showDebugInfo);

        const container = new Container(this.nativeElement, attributes,
                                        this._contextBinder, this,
                                        () => this.getEventDispatcher(),
                                        () => constructSubTree(this._contextBinder, this),
                                        () => this.removeChildren());

        const component = new Component(this.nativeElement, attributes,
                                        this._contextBinder, this,
                                        this.getManipulationProxyCreator(properties, attributes, styles, classes), this.getSubscriptionsProxyCreator(),
                                        () => this.getEventDispatcher());

        const template = new Template(this.nativeElement, attributes, this._contextBinder,
                                      () => constructSubTree(this._contextBinder, this));

        const aspects = new Aspects(this.nativeElement, attributes, this._contextBinder,
                                    this.getManipulationProxyCreator(properties, attributes, styles, classes), this.getSubscriptionsProxyCreator(),
                                    () => this.getEventDispatcher());
        
        const bound = new Bound(this.nativeElement, attributes, this.getManipulationProxyCreator(properties, attributes, styles, classes));
        const variables = new Variables(this.nativeElement, attributes);
        const projection = new Projection(this.immediateParent, attributes, this._contextBinder,
                                          () => {
                                            this.removeFromParent(false);
                                            this.dispose();
                                          });

        //additional info
        const visibilityCanBeChanged = if_.hasNExpression || switch_.hasNExpression || case_.hasNExpression || default_.hasNExpression || repeat.hasNExpression;
        const manipulationProxyCanBeUsed = events.hasElementManipulations || 
                                           component.hasElementManipulations || aspects.hasElementManipulations || 
                                           bound.hasElementManipulations;
                                           
        //handlers based assignments
        this.switch = switch_.hasNExpression ? switch_ : undefined;
        
        if (repeat.hasNExpression) {
            this.repeat = repeat;
            this.nativeElementForClone = Helpers.isUndefined(cloneOf) 
                                                ? nativeElement.cloneNode(true) 
                                                : cloneOf!.nativeElementForClone;
            this._clone = clone;
        } else {
            this.repeat = undefined;
            this._clone = undefined;
        }

        this.isSubTreeHandled = template.hasNExpression ||
                                container.hasNExpression || component.hasNExpression || 
                                value.hasNExpression || html.hasNExpression;

        //visibility sequences
        this._visibleParentHandlers = this.sequence<IVisible>(
            case_,
            default_
        );

        this._visibilityHandlers = this.sequence<IVisible>(
            if_,
            repeat,
            switch_,
            projection
        );
        
        //
        //soft removers sequences
        //
        //bind sequence
        this._bindSequenceSoftRemovers = this.sequence<IBindable>(
            repeat
        );

        //commit sequence
        this._commitSequenceSoftRemovers = this.sequence<ICommittable>(
            repeat
        );

        //
        //regular sequences
        //
        //bind sequence
        this._bindSequence = this.sequence<IBindable>(
            //should be first due to possibility of context creation
            variables,
            
            //should be second-ish
            bound,

            events,
            exec,
            if_,
            switch_,

            value,
            html,

            container,
            component,
            aspects,

            styles,
            classes,
            properties,
            attributes
        );
            
        //commit sequence
        this._commitSequence = this.sequenceTailed<ICommittable>(
            [
                classes.hasNExpression || visibilityCanBeChanged || manipulationProxyCanBeUsed ? classes : undefined,
                styles.hasNExpression || manipulationProxyCanBeUsed ? styles : undefined,
                attributes.hasNExpression || manipulationProxyCanBeUsed ? attributes : undefined,
                properties.hasNExpression || manipulationProxyCanBeUsed ? properties : undefined
            ],
            //sub-tree changers 
            if_,
            switch_,

            //impacted by sub-tree changes
            value,
            html,

            container,
            component,
            aspects
        );

        this._disposeSequence = this.sequence<IDisposable>(
            container,
            component,
            aspects,
            case_,
            default_,
            events,
            projection
        );

        //
        //sequences for for invisible nElements for cases when visibility is handled by parent nElement
        //
        //bind sequence
        this._bindSequenceInvisibleParentHandled = this.sequence<IBindable>(
            container,
            component
        );

        //commit sequence
        this._commitSequenceInvisibleParentHandled = this.sequenceTailed<ICommittable>(
            [
                classes.hasNExpression || visibilityCanBeChanged || manipulationProxyCanBeUsed ? classes : undefined,
                attributes.hasNExpression || manipulationProxyCanBeUsed ? attributes : undefined
            ],
            container,
            component
        );

        //validate
        const invalidHandlers = this.validate(value, html, 
                                              if_, switch_, case_, default_, 
                                              repeat, 
                                              container, component, 
                                              template);

        //process constructable
        // for (const el of [template]) {
        //     if (el.hasNExpression && !invalidHandlers.has(el)) {
        //         el.construct();
        //     }
        // }
        if (template.hasNExpression && !invalidHandlers.has(template)) {
            template.construct();
        }
    }

    public detectChanges(context: object, executionParams?: ExecutionParams): void {
        this._isStable = true;

        let currentExecutionParams = executionParams;

        if (this._isVisibleParentHandled) {
            if (!Helpers.isUndefined(this._bindSequenceSoftRemovers)) {
                currentExecutionParams = this.detectChangesInternal(context, currentExecutionParams, this._bindSequenceSoftRemovers, this._commitSequenceSoftRemovers);
            }

            if (!this._removed) {
                currentExecutionParams = this.detectChangesInternal(context, currentExecutionParams, this._bindSequence, this._commitSequence);
            }
        } else {
            currentExecutionParams = this.detectChangesInternal(context, currentExecutionParams, this._bindSequenceInvisibleParentHandled, this._commitSequenceInvisibleParentHandled);
        }

        if (this.isVisible && !this._removed) {
            super.detectChanges(context, currentExecutionParams);
        }
    }

    public remove(): void {
        this._removed = true;
    }

    public clone(): void {
        if (!this._removed) {
            if ((this.parent !== null) && (this.nativeElement.parentNode !== null)) {
                this._clone!(this._contextBinder, this.parent, this);
            } else {
                Console.error(this.nativeElement, 'attempt to clone orphaned element');
            }
        }
    }

    public dispose(): void {
        if (!this._isDisposed) {
            this._isDisposed = true;

            if (!Helpers.isUndefined(this._disposeSequence)) {
                for (const el of this._disposeSequence!) {
                    try {
                        el.dispose();
                    } catch(ex) {
                        Console.error(this.nativeElement, 'handler', el, `dispose error: ${ex}`);
                    }
                }
            }

            super.dispose();
        }
    }

    private detectChangesInternal(context: object, executionParams: ExecutionParams | undefined,
                                  bindSequence: Array<IBindable> | undefined, commitSequence: Array<ICommittable> | undefined): ExecutionParams | undefined {
        let currentExecutionParams = executionParams;

        if (!Helpers.isUndefined(bindSequence)) {
            for (const el of bindSequence!) {
                try {
                    currentExecutionParams = el.bind(currentExecutionParams, (expression, executionParams) => 
                                                     this._contextBinder.expressionExecutor.executeExpression(expression, context, 
                                                                                                              this.nativeElement, 
                                                                                                              executionParams));
                } catch(ex) {
                    Console.error(this.nativeElement, 'handler', el, `bind error: ${ex}`);
                }

                //breaking bind sequence due to optimization
                if (this._removed) {
                    break;
                }
            }
        }

        if (this._removed) {
            this.nativeElement!.remove();
            this.removeFromParent();
            this.dispose();
        } else {
            if (!Helpers.isUndefined(commitSequence)) {
                for (const el of commitSequence!) {
                    try {
                        const handlerCommitted = el.commit();
                        if (handlerCommitted) {
                            this._isStable = false;
                        }
                    } catch(ex) {
                        Console.error(this.nativeElement, 'handler', el ,`commit error: ${ex}`);
                    }
                }
            }
        }

        return currentExecutionParams;
    }

    private validate(value: Value, html: Html, 
                     if_: If, switch_: Switch, case_: Case, default_: Default,
                     repeat: Repeat,
                     container: Container, component: Component, 
                     template: Template): ReadonlySet<IConstructable | IBindable | ICommittable | IDisposable> {
        const invalidHandlers = new Set<IConstructable | IBindable | ICommittable | IDisposable>();

        const valueHandler = { handler: value, name: Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME };
        const htmlHandler = { handler: html, name: Constants.HANDLERS.HTML_HANDLER_ATTRIBUTE_NAME };
        const ifHandler = { handler: if_, name: Constants.HANDLERS.IF_HANDLER_ATTRIBUTE_NAME};
        const switchHandler = { handler: switch_, name: Constants.HANDLERS.SWITCH_HANDLER_ATTRIBUTE_NAME };
        const caseHandler = { handler: case_, name: Constants.HANDLERS.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME };
        const defaultHandler = { handler: default_, name: Constants.HANDLERS.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME };
        const repeatHandler = { handler: repeat, name: Constants.HANDLERS.REPEAT_HANDLER_ATTRIBUTE_NAME};
        const containerHandler = { handler: container, name: Constants.HANDLERS.CONTAINER_HANDLER_ATTRIBUTE_NAME };
        const componentHandler = { handler: component, name: Constants.HANDLERS.COMPONENT_MARKER_ATTRIBUTE_NAME };
        const templateHandler = { handler: template, name: Constants.HANDLERS.TEMPLATE_HANDLER_ATTRIBUTE_NAME };

        //handler content conflicts
        const contentChangers = [
            valueHandler, 
            htmlHandler,
            switchHandler, 
            containerHandler, 
            componentHandler,
            templateHandler
        ].filter(el => el.handler.hasNExpression);
        if (contentChangers.length > 1) {
            const contentChangerHandlers = [];

            for (const el of contentChangers) {
                invalidHandlers.add(el.handler);
                contentChangerHandlers.push(el.handler);
            }
            
            this.removeFromProcessingSequences(contentChangerHandlers);

            Console.error(this.nativeElement, `element can't have ${contentChangers.map(el => `${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //handler structure conflict
        const structureChangers = [
            caseHandler,
            defaultHandler,
            repeatHandler
        ].filter(el => el.handler.hasNExpression);
        if (structureChangers.length > 1) {
            const structureChangerHandlers = [];
            
            for (const el of structureChangers) {
                invalidHandlers.add(el.handler);
                structureChangerHandlers.push(el.handler);
            }

            this.removeFromProcessingSequences(structureChangerHandlers);

            Console.error(this.nativeElement, `element can't have ${structureChangers.map(el => `${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //handler function conflict
        const functionChangers = [
            caseHandler,
            defaultHandler,
            ifHandler
        ].filter(el => el.handler.hasNExpression);
        if (functionChangers.length > 1) {
            const functionChangerHandlers = [];
            
            for (const el of functionChangers) {
                invalidHandlers.add(el.handler);
                functionChangerHandlers.push(el.handler);
            }

            this.removeFromProcessingSequences(functionChangerHandlers);

            Console.error(this.nativeElement, `element can't have ${functionChangers.map(el => `${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //child elements changers conflict
        if (this._contextBinder.showDebugInfo) {
            const childElementsChangers = [
                valueHandler, 
                htmlHandler
            ].filter(el => el.handler.hasNExpression);
            if ((childElementsChangers.length > 0) && 
                Array.from(this.nativeElement.childNodes).some(el => (el.nodeType == Node.ELEMENT_NODE) || 
                                                                     ((el.nodeType == Node.TEXT_NODE) &&
                                                                      Helpers.isNotEmptyString(el.textContent) &&
                                                                      (el.textContent!.trim().length > 0)))) {
                Console.warn(this.nativeElement, `element original children will be replaced by '${childElementsChangers[0].name}'`);
            }
        }

        return invalidHandlers;
    }

    private removeFromProcessingSequences(handlers: Array<IBindable | ICommittable | IDisposable>): void {
        const bindSequenceSoftRemovers = !Helpers.isUndefined(this._bindSequenceSoftRemovers) ? this._bindSequenceSoftRemovers! : [];
        const bindSequence = !Helpers.isUndefined(this._bindSequence) ? this._bindSequence! : [];
        const bindSequenceInvisibleParentHandled = !Helpers.isUndefined(this._bindSequenceInvisibleParentHandled) ? this._bindSequenceInvisibleParentHandled! : [];
       
        const commitSequenceSoftRemovers = !Helpers.isUndefined(this._commitSequenceSoftRemovers) ? this._commitSequenceSoftRemovers! : [];
        const commitSequence = !Helpers.isUndefined(this._commitSequence) ? this._commitSequence! : [];
        const commitSequenceInvisibleParentHandled = !Helpers.isUndefined(this._commitSequenceInvisibleParentHandled) ? this._commitSequenceInvisibleParentHandled! : [];

        const disposeSequence = !Helpers.isUndefined(this._disposeSequence) ? this._disposeSequence! : []; 

        for (const handler of handlers) {
            const bindSequenceSoftRemoversIndex = bindSequenceSoftRemovers.indexOf(<IBindable>handler);
            if (bindSequenceSoftRemoversIndex >= 0) {
                bindSequenceSoftRemovers.splice(bindSequenceSoftRemoversIndex, 1);
            }

            const bindSequenceIndex = bindSequence.indexOf(<IBindable>handler);
            if (bindSequenceIndex >= 0) {
                bindSequence.splice(bindSequenceIndex, 1);
            }

            const bindSequenceInvisibleParentHandledIndex = bindSequenceInvisibleParentHandled.indexOf(<IBindable>handler);
            if (bindSequenceInvisibleParentHandledIndex >= 0) {
                bindSequenceInvisibleParentHandled.splice(bindSequenceInvisibleParentHandledIndex, 1);
            }

            const commitSequenceSoftRemoversIndex = commitSequenceSoftRemovers.indexOf(<ICommittable>handler);
            if (commitSequenceSoftRemoversIndex >= 0) {
                commitSequenceSoftRemovers.splice(commitSequenceSoftRemoversIndex, 1);
            }

            const commitSequenceIndex = commitSequence.indexOf(<ICommittable>handler);
            if (commitSequenceIndex >= 0) {
                commitSequence.splice(commitSequenceIndex, 1);
            }

            const commitSequenceInvisibleParentHandledIndex = commitSequenceInvisibleParentHandled.indexOf(<ICommittable>handler);
            if (commitSequenceInvisibleParentHandledIndex >= 0) {
                commitSequenceInvisibleParentHandled.splice(commitSequenceInvisibleParentHandledIndex, 1);
            }

            const disposeSequenceIndex = disposeSequence.indexOf(<IDisposable>handler);
            if (disposeSequenceIndex >= 0) {
                disposeSequence.splice(disposeSequenceIndex, 1);
            }
        }
    }

    private getEventDispatcher(): EventDispatcher {
        if (Helpers.isUndefined(this._eventDispatcher)) {
            this._eventDispatcher = new EventDispatcher(this.nativeElement);
        }

        return this._eventDispatcher!;
    }
    

    private removeFromParent(debounce: boolean = true): void {
        if (this.parent !== null) { 
            this.parent.removeChild(this, debounce);
        }
    }

    private removeChildren(): void {
        if (!Helpers.isUndefined(this.children)) {
            for (const el of this.children!) {
                el.dispose();
            }
        }

        this.removeAndStabilizeChildren();
    }

    private sequence<T>(...items: Array<{ hasNExpression: boolean } & T>): Array<T> | undefined {
        const buffer = new Array<T>(items.length);
        let index = 0;

        for (const el of items) {
            if (el.hasNExpression) {
                buffer[index++] = el;
            }
        }

        return index > 0 ? buffer.slice(0, index) : undefined;
    }

    private sequenceTailed<T>(tail: Array<T | undefined>, ...items: Array<{ hasNExpression: boolean } & T>): Array<T> | undefined {
        const buffer = new Array<T>(items.length + tail.length);
        let index = 0;

        for (const el of items) {
            if (el.hasNExpression) {
                buffer[index++] = el;
            }
        }

        for (const el of tail) {
            if (!Helpers.isUndefined(el)) {
                buffer[index++] = el!;
            }
        }

        return index > 0 ? buffer.slice(0, index) : undefined;
    }

    private getSubscriptionsProxyCreator(): () => ElementSubscriptions {
        return () => {
            if (Helpers.isUndefined(this._elementSubscriptions)) {
                this._elementSubscriptions = new ElementSubscriptions((eventName, callBack, optionsOrDebounce, debounce) => Helpers.isNumber(optionsOrDebounce) && !isNaN(<number>optionsOrDebounce)
                                                                                                                                        ? Events.subscribe(this.nativeElement, eventName, callBack, undefined, <number>optionsOrDebounce)
                                                                                                                                        : Events.subscribe(this.nativeElement, eventName, callBack, <boolean | AddEventListenerOptions | undefined>optionsOrDebounce, debounce));
            }

            return this._elementSubscriptions!;
        }
    }

    //TODO: Think about validation on manipulations on properties, attributes and styles when handler already exists and injection is trying to manipulate the same
    private getManipulationProxyCreator(properties: Properties, attributes: Attributes, styles: Styles, classes: Classes): () => ElementManipulations {
        return () => {
            if (Helpers.isUndefined(this._elementManipulations)) {
                this._elementManipulations = new ElementManipulations(new ElementPropertiesManipulations((propertyKey) => properties.get(propertyKey),
                                                                                                         (propertyKey, propertyValue) => {
                                                                                                            properties.set(propertyKey, propertyValue);
                                                                                                            if (properties.isDirty) {
                                                                                                                this._contextBinder.detectChanges();
                                                                                                            }
                                                                                                         }),
                                                                      new ElementAttributesManipulations(attributeName => attributes.has(attributeName),
                                                                                                         attributeName => <string | undefined>attributes.get(attributeName),
                                                                                                         () => attributes.getAll(),
                                                                                                         (attributeName, value) => {
                                                                                                            attributes.set(attributeName, value);
                                                                                                            if (attributes.isDirty) {
                                                                                                                this._contextBinder.detectChanges();
                                                                                                            }
                                                                                                         },
                                                                                                         attributeName => {
                                                                                                            attributes.remove(attributeName);
                                                                                                            if (attributes.isDirty) {
                                                                                                                this._contextBinder.detectChanges();
                                                                                                            }
                                                                                                         }),
                                                                      new ElementStylesManipulations(propertyName => styles.has(propertyName),
                                                                                                     propertyName => styles.get(propertyName),
                                                                                                     () => styles.getAll(),
                                                                                                     (propertyName, propertyValue) => {
                                                                                                            styles.set(propertyName, propertyValue);
                                                                                                            if (styles.isDirty) {
                                                                                                                this._contextBinder.detectChanges();
                                                                                                            }
                                                                                                     },
                                                                                                     propertyName => {
                                                                                                             styles.remove(propertyName);
                                                                                                             if (styles.isDirty) {
                                                                                                                 this._contextBinder.detectChanges();
                                                                                                             }
                                                                                                     }),
                                                                      new ElementClassesManipulations(className => classes.has(className),
                                                                                                     () => classes.getAll(),
                                                                                                     className => {
                                                                                                         classes.add(className);
                                                                                                         if (classes.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                     },
                                                                                                     className => {
                                                                                                         classes.remove(className);
                                                                                                         if (classes.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                     },
                                                                                                     className => {
                                                                                                         classes.toggle(className);
                                                                                                         if (classes.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                     }));
            }

            return this._elementManipulations!;
        }
    }

    //TODO: think of more elegant solution
    public static isNApplicable(nativeElement: Element): boolean {
        return Attributes.isNApplicable(nativeElement) || Component.isNApplicable(nativeElement);
    }
}