import { INElement, INTreeElement } from '../interfaces/nElement/INElement';
import { IVisible } from '../interfaces/nElement/IVisible';
import { ICommittable } from '../interfaces/nElement/ICommittable';
import { IBindable } from '../interfaces/nElement/IBindable';
import { IDisposable } from '../interfaces/IDisposable'

import { ContextBinder } from '../ContextBinder';

import { ExecutionParams } from '../expression/ExpressionExecParamsHelper';
import { ExpressionExecutor } from '../expression/ExpressionExecutor';

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

import { EventDispatcher } from '../models/injections/EventDispatcher';
import { ElementSubscriptions } from '../models/injections/ElementSubscriptions';
import { ElementManipulations, 
         ElementPropertiesManipulations, ElementAttributesManipulations,
         ElementStylesManipulations, ElementClassesManipulations } from '../models/injections/ElementManipulations';

import { Helpers } from '../Helpers';
import { Console  } from '../Console';
import { Constants } from '../Constants';

export class NTreeElement implements INTreeElement {
    protected readonly _childrenToRemove: Array<INTreeElement> = [];
    protected readonly _children: Array<INTreeElement> = [];

    public readonly isSubTreeHandled: boolean = false;

    protected _isStable = true;
    public get isStable(): boolean {
        return this._isStable && this._children.every(el => el.isStable);
    }

    public readonly nativeElement: Element;

    constructor (nativeElement: Element) {
        this.nativeElement = nativeElement;
    }

    public addChild(nElement: INTreeElement): void {
        this._children.push(nElement);
    }

    public removeChild(nElement: INTreeElement): void {
        this._childrenToRemove.push(nElement);
    }

    public detectChanges(context: object, executionParams?: ExecutionParams): void {
        for (const el of this._children) {
            el.detectChanges(context);
        }

        this.stabilizeChildren();
    }

    public stabilizeChildren() {
        while (this._childrenToRemove.length > 0) {
            const expectedIndex = this._children.indexOf(this._childrenToRemove.pop()!);
            if (expectedIndex >= 0) {
                this._children.splice(expectedIndex, 1);
            }
        }
    }

    public dispose(): void {
        for (const el of this._children) {
            el.dispose();
        }
    }
}

export class NElement extends NTreeElement implements INElement {
    private readonly _contextBinder: ContextBinder;
    private readonly _parent: INElement | INTreeElement | null;

    private readonly _clone: ((nElementsParent: INElement, nElement: INElement) => void) | undefined;
    
    private readonly _bindSequenceInvisibleParentHandled: Array<IBindable> | undefined;
    private readonly _commitSequenceInvisibleParentHandled: Array<ICommittable> | undefined;

    private readonly _bindSequenceSoftRemovers: Array<IBindable> | undefined;
    private readonly _commitSequenceSoftRemovers: Array<ICommittable> | undefined;

    private readonly _bindSequence: Array<IBindable> | undefined;
    private readonly _commitSequence: Array<ICommittable> | undefined;
    private readonly _disposeSequence: Array<IDisposable> | undefined;

    private _removed = false;
    private _isDisposed = false;

    private get _expressionExecutor(): ExpressionExecutor {
        return this._contextBinder.expressionExecutor;
    }

    //handlers that are handles in parents but changing child visibility
    private readonly _visibleParentHandlers: Array<IVisible> | undefined;
    private get _isVisibleParentHandled(): boolean {
        return Helpers.isUndefined(this._visibleParentHandlers) || !this._visibleParentHandlers!.some(el => !el.isVisible);
    }

    private readonly _visibilityHandlers: Array<IVisible> | undefined;
    private get _isVisible(): boolean {
        return this._isVisibleParentHandled &&
               (Helpers.isUndefined(this._visibilityHandlers) || !this._visibilityHandlers!.some(el => !el.isVisible));
    }

    private _eventDispatcher: EventDispatcher | undefined;
    private _elementSubscriptions: ElementSubscriptions | undefined;
    private _elementManipulations: ElementManipulations | undefined;

    public readonly nativeElementForClone: Node | undefined;

    public readonly repeat: Repeat | undefined;
    public readonly switch: Switch | undefined;

    public readonly isSubTreeHandled: boolean;

    constructor (contextBinder: ContextBinder, parent: INElement | INTreeElement | null, nativeElement: Element, cloneOf: INElement | undefined,
                 clone: (nElementsParent: INElement | INTreeElement, nElement: INElement) => void,
                 constructSubTree: (nElementsParent: INElement) => void) {
        super(nativeElement);

        this._contextBinder = contextBinder;
        this._parent = parent;

        //handlers creation
        const attributes = new Attributes(this.nativeElement, () => contextBinder.getShowDebugInfo());
        const properties = new Properties(this.nativeElement, attributes);

        const classes = new Classes(this.nativeElement, attributes,
                                   () => contextBinder.getHiddenClassName());
        const styles = new Styles(this.nativeElement, attributes);

        const value = new Value(this.nativeElement, attributes);
        const html = new Html(this.nativeElement, attributes,
                              contextBinder.htmlSanitizer);

        const events = new Events(this.nativeElement, attributes,
                                  this.getManipulationProxyCreator(properties, attributes, styles, classes), 
                                  () => contextBinder.detectChanges());
        const exec = new Exec(attributes);

        const if_ = new If(this.nativeElement, attributes, classes);
        const switch_ = new Switch(this.nativeElement, attributes, classes);
        const case_ = new Case(this.nativeElement, attributes, classes, (<INElement>parent)?.switch);
        const default_ = new Default(this.nativeElement, attributes, classes, (<INElement>parent)?.switch);

        const repeat = new Repeat(this.nativeElement, attributes, classes,
                                  () => this.clone(), 
                                  () => this._removed = true,
                                  () => contextBinder.getShowDebugInfo(),
                                  cloneOf?.repeat);

        const container = new Container(this.nativeElement, attributes,
                                        () => this.getEventDispatcher(),
                                        () => this._isVisible,
                                        () => contextBinder.detectChanges(),
                                        context => contextBinder.containerAttached(context),
                                        context => contextBinder.containerDetached(context));

        const component = new Component(this.nativeElement, attributes,
                                        this.getManipulationProxyCreator(properties, attributes, styles, classes), this.getSubscriptionsProxyCreator(events),
                                        () => this.getEventDispatcher(),
                                        () => this._isVisible);

        const aspects = new Aspects(this.nativeElement, attributes,
                                    this.getManipulationProxyCreator(properties, attributes, styles, classes), this.getSubscriptionsProxyCreator(events),
                                    () => this.getEventDispatcher(),
                                    () => contextBinder.detectChanges());

        const template = new Template(this.nativeElement, attributes, 
                                      () => constructSubTree(this), () => contextBinder.detectChanges());
        
        const bound = new Bound(this.nativeElement, attributes, this.getManipulationProxyCreator(properties, attributes, styles, classes));
        const variables = new Variables(this.nativeElement, attributes);

        //additional info
        const visibilityCanBeChanged = if_.hasNExpression || switch_.hasNExpression || case_.hasNExpression || default_.hasNExpression || repeat.hasNExpression;
        const manipulationProxyCanBeUsed = events.hasNExpression || 
                                           component.hasNExpression || aspects.hasNExpression || 
                                           bound.hasNExpression;
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
        const visibleParentHandlers = [
            case_,
            default_
        ].filter(el => el.hasNExpression);
        this._visibleParentHandlers = visibleParentHandlers.length > 0 ? visibleParentHandlers : undefined;

        const visibilityHandlers = [
            if_,
            repeat,
            switch_
        ].filter(el => el.hasNExpression);
        this._visibilityHandlers = visibilityHandlers.length > 0 ? visibilityHandlers : undefined;
        
        //
        //soft removers sequences
        //
        //bind sequence
        const bindSequenceSoftRemovers = [
            repeat
        ].filter(el => el.hasNExpression);
        this._bindSequenceSoftRemovers = bindSequenceSoftRemovers.length > 0 ? bindSequenceSoftRemovers : undefined;

        //commit sequence
        const commitSequenceSoftRemovers = [
            repeat
        ].filter(el => el.hasNExpression);
        this._commitSequenceSoftRemovers = commitSequenceSoftRemovers.length > 0 ? commitSequenceSoftRemovers : undefined;

        //
        //regular sequences
        //
        //bind sequence
        const bindSequence = [
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
        ].filter(el => el.hasNExpression);
        this._bindSequence= bindSequence.length > 0 ? bindSequence : undefined;
            
        //commit sequence
        const commitSequence = [
            //sub-tree changers 
            if_,
            switch_,

            //impacted by sub-tree changes
            value,
            html,

            container,
            component,
            aspects
        ].filter(el => el.hasNExpression);
        this._commitSequence = (commitSequence.length > 0) ||
                                classes.hasNExpression || styles.hasNExpression || attributes.hasNExpression || properties.hasNExpression ||
                                visibilityCanBeChanged || manipulationProxyCanBeUsed
                                    ? commitSequence 
                                    : undefined;

        //should be last due to usage by other handlers
        if (classes.hasNExpression || visibilityCanBeChanged || manipulationProxyCanBeUsed) {
            this._commitSequence!.push(classes);
        }

        if (styles.hasNExpression || manipulationProxyCanBeUsed) {
            this._commitSequence!.push(styles);
        }
        
        if (attributes.hasNExpression || manipulationProxyCanBeUsed) {
            this._commitSequence!.push(attributes);
        }
        
        if (properties.hasNExpression || manipulationProxyCanBeUsed) {
            this._commitSequence!.push(properties);
        }

        const disposeSequence = [
            container,
            component,
            aspects,
            case_,
            default_,
            events
        ].filter(el => el.hasNExpression);
        this._disposeSequence = disposeSequence.length > 0 ? disposeSequence : undefined;

        //
        //sequences for for invisible nElements for cases when visibility is handled by parent nElement
        //
        //bind sequence
        const bindSequenceInvisibleParentHandled = [
            container,
            component
        ].filter(el => el.hasNExpression);
        this._bindSequenceInvisibleParentHandled = bindSequenceInvisibleParentHandled.length > 0 ? bindSequenceInvisibleParentHandled : undefined;

        //commit sequence
        const commitSequenceInvisibleParentHandled = [
            container,
            component
        ].filter(el => el.hasNExpression);
        this._commitSequenceInvisibleParentHandled = (commitSequenceInvisibleParentHandled.length > 0) ||
                                                      classes.hasNExpression || attributes.hasNExpression ||
                                                      visibilityCanBeChanged || manipulationProxyCanBeUsed
                                                                ? commitSequenceInvisibleParentHandled 
                                                                : undefined;

        //should be last due to usage by other handlers
        if (classes.hasNExpression || visibilityCanBeChanged || manipulationProxyCanBeUsed) {
            this._commitSequenceInvisibleParentHandled!.push(classes);
        }

        if (attributes.hasNExpression || manipulationProxyCanBeUsed) {
            this._commitSequenceInvisibleParentHandled!.push(attributes);
        }

        //validate
        this.validate(value, html, 
                      if_, switch_, case_, default_, 
                      repeat, 
                      container, component, template);
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

        if (this._isVisible && !this._removed) {
            for (const el of this._children) {
                el.detectChanges(context, currentExecutionParams);
            }

            this.stabilizeChildren();
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

            for (const el of this._children) {
                el.dispose();
            }
        }
    }

    private detectChangesInternal(context: object, executionParams: ExecutionParams | undefined,
                                  bindSequence: Array<IBindable> | undefined, commitSequence: Array<ICommittable> | undefined): ExecutionParams | undefined {
        let currentExecutionParams = executionParams;

        if (!Helpers.isUndefined(bindSequence)) {
            for (const el of bindSequence!) {
                try {
                    currentExecutionParams = el.bind(currentExecutionParams, (expression, executionParams) => 
                                                                            this._expressionExecutor.executeExpression(expression, context, 
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

            if (this._parent !== null) { 
                this._parent.removeChild(this);
            }

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

    private clone(): void {
        if (!this._removed) {
            if ((this._parent !== null) && (this.nativeElement.parentNode !== null)) {
                this._clone!(<INElement>this._parent, this);
            } else {
                Console.error(this.nativeElement, 'attempt to clone orphaned element');
            }
        }
    }

    private validate(value: Value, html: Html, 
                     if_: If, switch_: Switch, case_: Case, default_: Default,
                     repeat: Repeat,
                     container: Container, component: Component, template: Template,): void {
        //handler content conflicts
        const contentChangers = [
            { handler: value, name: 'value' }, 
            { handler: html, name: 'html' },
            { handler: switch_, name: 'switch' }, 
            { handler: container, name: 'container' }, 
            { handler: component, name: 'component' },
            { handler: template, name: 'template' }
        ].filter(el => el.handler.hasNExpression);
        if (contentChangers.length > 1) {
            this.removeFromProcessingSequences(contentChangers.map(el => el.handler));
            Console.error(this.nativeElement, `element can't have ${contentChangers.map(el => `${Constants.DEFAULT_PREFIX}-${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //handler structure conflict
        const structureChangers = [
            { handler: case_, name: 'case'},
            { handler: default_, name: 'default'},
            { handler: repeat, name: 'repeat'}
        ].filter(el => el.handler.hasNExpression);
        if (structureChangers.length > 1) {
            this.removeFromProcessingSequences(structureChangers.map(el => el.handler));
            Console.error(this.nativeElement, `element can't have ${structureChangers.map(el => `${Constants.DEFAULT_PREFIX}-${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //handler function conflict
        const functionChangers = [
            { handler: case_, name: 'case'},
            { handler: default_, name: 'default'},
            { handler: if_, name: 'if'}
        ].filter(el => el.handler.hasNExpression);
        if (functionChangers.length > 1) {
            this.removeFromProcessingSequences(functionChangers.map(el => el.handler));
            Console.error(this.nativeElement, `element can't have ${functionChangers.map(el => `${Constants.DEFAULT_PREFIX}-${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //child elements changers conflict
        if (this._contextBinder.getShowDebugInfo()) {
            const childElementsChangers = [
                { handler: value, name: 'value' }, 
                { handler: html, name: 'value' },
            ].filter(el => el.handler.hasNExpression);
            if ((childElementsChangers.length > 0) && 
                 Array.from(this.nativeElement.childNodes).some(el => (el.nodeType == Node.ELEMENT_NODE) || 
                                                                      ((el.nodeType == Node.TEXT_NODE) &&
                                                                       Helpers.isNotEmptyString(el.textContent) &&
                                                                       (el.textContent!.trim().length > 0)))) {
                Console.warn(this.nativeElement, `element original children will replaced by ${Constants.DEFAULT_PREFIX}-${childElementsChangers[0].name}`);
            }
        }
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
    private getSubscriptionsProxyCreator(events: Events): () => ElementSubscriptions {
        return () => {
            if (Helpers.isUndefined(this._elementSubscriptions)) {
                this._elementSubscriptions = new ElementSubscriptions((eventName, callBack, optionsOrDebounce, debounce) => Helpers.isNumber(optionsOrDebounce) && !isNaN(<number>optionsOrDebounce)
                                                                                                                                        ? events.subscribe(eventName, callBack, undefined, <number>optionsOrDebounce)
                                                                                                                                        : events.subscribe(eventName, callBack, <boolean | AddEventListenerOptions | undefined>optionsOrDebounce, debounce));
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

    public static isNApplicable(nativeElement: Element): boolean {
        return Attributes.isNApplicable(nativeElement) || Component.isNApplicable(nativeElement);
    }
}