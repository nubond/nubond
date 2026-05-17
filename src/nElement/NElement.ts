import { INElement, INTreeElement } from '../interfaces/nElement/INElement';
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

    public get isSubTreeHandled(): boolean {
        return false;
    }

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

    private readonly _clone: (nElementsParent: INElement, nElement: INElement) => void;
    
    private readonly _commitSequenceInvisibleParentHandled: Array<ICommittable>;
    private readonly _bindSequenceInvisibleParentHandled: Array<IBindable>;

    private readonly _commitSequence: Array<ICommittable>;
    private readonly _bindSequence: Array<IBindable>;
    private readonly _disposeSequence: Array<IDisposable>;

    private _isDisposed = false;
    private _removed = false;

    private get _expressionExecutor(): ExpressionExecutor {
        return this._contextBinder.expressionExecutor;
    }

    //handlers that are handles in parents but changing child visibility
    private get _isVisibleParentHandled(): boolean {
        return (!this.case.hasNExpression || (this.case.hasNExpression && this.case.isVisible)) &&
               (!this.default.hasNExpression || (this.default.hasNExpression && this.default.isVisible));
    }

    private get _isVisible(): boolean {
        return this._isVisibleParentHandled &&
               (!this.if.hasNExpression || (this.if.hasNExpression && this.if.isVisible)) &&
               (!this.repeat.hasNExpression || (this.repeat.hasNExpression && this.repeat.isVisible)) &&
               (!this.switch.hasNExpression || (this.switch.hasNExpression && this.switch.isVisible));
    }


    private _eventDispatcher: EventDispatcher | undefined;
    private _elementSubscriptions: ElementSubscriptions | undefined;
    private _elementManipulations: ElementManipulations | undefined;

    public readonly nativeElementForClone: Node | undefined;

    public readonly attributes: Attributes;
    public readonly classes: Classes;
    public readonly styles: Styles;
    public readonly value: Value;
    public readonly html: Html;
    public readonly if: If;
    public readonly events: Events;
    public readonly properties: Properties;
    public readonly repeat: Repeat;
    public readonly exec: Exec;
    public readonly switch: Switch;
    public readonly case: Case;
    public readonly default: Default;
    public readonly bound: Bound;
    public readonly variables: Variables;

    public readonly container: Container;
    public readonly component: Component;
    public readonly aspects: Aspects;
    public readonly template: Template;

    public get isSubTreeHandled(): boolean {
        return this.container.hasNExpression || this.template.hasNExpression;
    }

    constructor (contextBinder: ContextBinder, parent: INElement | INTreeElement | null, nativeElement: Element, cloneOf: INElement | undefined,
                 clone: (nElementsParent: INElement | INTreeElement, nElement: INElement) => void,
                 constructSubTree: (nElementsParent: INElement) => void) {
        super(nativeElement);

        this._contextBinder = contextBinder;
        this._parent = parent;
        this._clone = clone;
        
        this.attributes = new Attributes(this.nativeElement);
        this.classes = new Classes(this.nativeElement, this.attributes,
                                   () => contextBinder.getHiddenClassName());
        
        this.styles = new Styles(this.nativeElement, this.attributes);

        this.value = new Value(this.nativeElement, this.attributes);
        this.html = new Html(this.nativeElement, this.attributes,
                             contextBinder.htmlSanitizer);

        this.events = new Events(this.nativeElement, this.attributes,
                                 () => this.getManipulationProxy(), 
                                 () => contextBinder.detectChanges());
        this.exec = new Exec(this.attributes);

        this.if = new If(this.attributes, this.classes);
        this.switch = new Switch(this.attributes, this.classes);
        this.case = new Case(this.nativeElement, this.attributes, this.classes, (<INElement>parent)?.switch);
        this.default = new Default(this.nativeElement, this.attributes, this.classes, (<INElement>parent)?.switch);
        this.repeat = new Repeat(this.nativeElement, this.attributes, this.classes,
                                 () => this.clone(), 
                                 () => this._removed = true,
                                 () => contextBinder.getShowDebugInfo(),
                                 cloneOf?.repeat);

        this.container = new Container(this.nativeElement, this.attributes,
                                       () => this.getEventDispatcher(),
                                       () => this._isVisible,
                                       () => contextBinder.detectChanges(),
                                       context => contextBinder.containerAttached(context),
                                       context => contextBinder.containerDetached(context));

        this.component = new Component(this.nativeElement, this.attributes,
                                       () => this.getManipulationProxy(), () => this.getSubscriptionsProxy(), () => this.getEventDispatcher(),
                                       () => this._isVisible);

        this.aspects = new Aspects(this.nativeElement, this.attributes,
                                   () => this.getManipulationProxy(), () => this.getSubscriptionsProxy(), () => this.getEventDispatcher(),
                                   () => contextBinder.detectChanges());

        this.properties = new Properties(this.nativeElement, this.attributes);
        this.template = new Template(this.nativeElement, this.attributes, 
                                     () => constructSubTree(this), () => contextBinder.detectChanges());
        
        this.bound = new Bound(this.nativeElement, this.attributes, () => this.getManipulationProxy());
        this.variables = new Variables(this.nativeElement, this.attributes);

        if (this.repeat.hasNExpression) {
            this.nativeElementForClone = Helpers.isUndefined(cloneOf) 
                                                ? nativeElement.cloneNode(true) 
                                                : cloneOf!.nativeElementForClone;
        }

        //validate
        this.validate();
        
        //regular sequences
        //bind sequence
        this._bindSequence = [
            //should be first due to possibility of context creation
            this.repeat,
            //should be second due to possibility of context creation
            this.variables,
            
            //should be second-ish
            this.bound,

            this.events,
            this.exec,
            this.if,
            this.switch,

            this.value,
            this.html,

            this.container,
            this.component,
            this.aspects,

            this.styles,
            this.classes,
            this.properties,
            this.attributes
        ].filter(el => el.hasNExpression);
            
        //commit sequence
        this._commitSequence = [
            //not impacted by sub-tree change
            //--

            //sub-tree changers, can request forceUpdateDynamicElements 
            this.repeat,
            this.if,
            this.switch,

            //impacted by sub-tree changes
            this.value,
            this.html,

            this.container,
            this.component,
            this.aspects
        ].filter(el => el.hasNExpression);

        //should be last due to usage by other handlers
        this._commitSequence.push(this.styles);
        this._commitSequence.push(this.classes);
        this._commitSequence.push(this.attributes);
        this._commitSequence.push(this.properties);

        this._disposeSequence = [
            this.container,
            this.component,
            this.aspects,
            this.case,
            this.default,
            this.events
        ].filter(el => el.hasNExpression);

        //sequences for for invisible nElements for cases when visibility is handled by parent nElement
        //bind sequence
        this._bindSequenceInvisibleParentHandled = [
            this.container,
            this.component
        ].filter(el => el.hasNExpression);

        //commit sequence
        this._commitSequenceInvisibleParentHandled = [
            this.container,
            this.component
        ].filter(el => el.hasNExpression);

        //should be last due to usage by other handlers
        this._commitSequenceInvisibleParentHandled.push(this.classes);
    }

    public detectChanges(context: object, executionParams?: ExecutionParams): void {
        this._isStable = true;

        if (this._isVisibleParentHandled) {
            this.detectChangesInternal(context, executionParams, this._bindSequence, this._commitSequence);
        } else {
            this.detectChangesInternal(context, executionParams, this._bindSequenceInvisibleParentHandled, this._commitSequenceInvisibleParentHandled);
        }
    }

    public dispose(): void {
        if (!this._isDisposed) {
            this._isDisposed = true;

            for (const el of this._disposeSequence) {
                try {
                    el.dispose();
                } catch(ex) {
                    Console.error(this.nativeElement, 'handler', el, `dispose error: ${ex}`);
                }
            }

            for (const el of this._children) {
                el.dispose();
            }
        }
    }

    private detectChangesInternal(context: object, executionParams: ExecutionParams | undefined,
                                  bindSequence: Array<IBindable>, commitSequence: Array<ICommittable>): void {
       let currentExecutionParams = executionParams;

        for (const el of bindSequence) {
            try {
                currentExecutionParams = el.bind(currentExecutionParams, (expression, executionParams) => 
                                                                            this._expressionExecutor.executeExpression(expression, context, 
                                                                                                                        this.nativeElement, 
                                                                                                                        executionParams));
            } catch(ex) {
                Console.error(this.nativeElement, 'handler', el, `bind error: ${ex}`);
            }

            //braking bind sequence due to optimization
            if (this._removed) {
                break;
            }
        }

        if (this._removed) {
            this.nativeElement!.remove();

            if (this._parent !== null) { 
                this._parent.removeChild(this);
            }

            this.dispose();
        } else {
            for (const el of commitSequence) {
                try {
                    const handlerCommitted = el.commit();
                    if (handlerCommitted) {
                        this._isStable = false;
                    }
                } catch(ex) {
                    Console.error(this.nativeElement, 'handler', el ,`commit error: ${ex}`);
                }
            }

            if (this._isVisible) {
                for (const el of this._children) {
                    el.detectChanges(context, currentExecutionParams);
                }

                this.stabilizeChildren();
            }
        }
    }

    private clone(): void {
        if (!this._removed) {
            if (this._parent !== null) {
                this._clone(<INElement>this._parent, this);
            } else {
                Console.error(this.nativeElement, 'attempt to clone without parent');
            }
        }
    }

    private validate(): void {
        //element content conflicts
        const contentChangers = [
            { handler: this.value, name: 'value' }, 
            { handler: this.html, name: 'html' },
            { handler: this.switch, name: 'switch' }, 
            { handler: this.container, name: 'container' }, 
            { handler: this.component, name: 'component' },
            { handler: this.template, name: 'template' }
        ].filter(el => el.handler.hasNExpression);
        if (contentChangers.length > 1) {
            this.removeFromProcessingSequences(contentChangers.map(el => el.handler));
            Console.error(this.nativeElement, `element can't have ${contentChangers.map(el => `${Constants.DEFAULT_PREFIX}-${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //handler structure conflict
        const structureChangers = [
            { handler: this.case, name: 'case'},
            { handler: this.default, name: 'default'},
            { handler: this.repeat, name: 'repeat'}
        ].filter(el => el.handler.hasNExpression);
        if (structureChangers.length > 1) {
            this.removeFromProcessingSequences(structureChangers.map(el => el.handler));
            Console.error(this.nativeElement, `element can't have ${structureChangers.map(el => `${Constants.DEFAULT_PREFIX}-${el.name}`).join(' and ')} bindings at the same time.`);
        }

        //handler function conflict
        const functionChangers = [
            { handler: this.case, name: 'case'},
            { handler: this.default, name: 'default'},
            { handler: this.if, name: 'if'}
        ].filter(el => el.handler.hasNExpression);
        if (functionChangers.length > 1) {
            this.removeFromProcessingSequences(functionChangers.map(el => el.handler));
            Console.error(this.nativeElement, `element can't have ${functionChangers.map(el => `${Constants.DEFAULT_PREFIX}-${el.name}`).join(' and ')} bindings at the same time.`);
        }
    }

    private removeFromProcessingSequences(handlers: Array<IBindable | ICommittable | IDisposable>): void {
        for (const handler of handlers) {
            const bindSequenceIndex = this._bindSequence.indexOf(<IBindable>handler);
            if (bindSequenceIndex >= 0) {
                this._bindSequence.splice(bindSequenceIndex, 1);
            }

            const commitSequenceIndex = this._commitSequence.indexOf(<ICommittable>handler);
            if (commitSequenceIndex >= 0) {
                this._commitSequence.splice(commitSequenceIndex, 1);
            }

            const disposeSequenceIndex = this._disposeSequence.indexOf(<IDisposable>handler);
            if (disposeSequenceIndex >= 0) {
                this._disposeSequence.splice(disposeSequenceIndex, 1);
            }
        }
    }

    private getEventDispatcher(): EventDispatcher {
        if (Helpers.isUndefined(this._eventDispatcher)) {
            this._eventDispatcher = new EventDispatcher(this.nativeElement);
        }

        return this._eventDispatcher!;
    }
    private getSubscriptionsProxy(): ElementSubscriptions {
        if (Helpers.isUndefined(this._elementSubscriptions)) {
            this._elementSubscriptions = new ElementSubscriptions(eventName => this.events.isSubscribed(eventName),
                                                                  eventName => this.events.isUnSubscribed(eventName),
                                                                  (eventName, callBack, optionsOrDebounce, debounce) => Helpers.isNumber(optionsOrDebounce) && !isNaN(<number>optionsOrDebounce)
                                                                                                                                    ? this.events.subscribe(eventName, callBack, undefined, <number>optionsOrDebounce)
                                                                                                                                    : this.events.subscribe(eventName, callBack, <boolean | AddEventListenerOptions | undefined>optionsOrDebounce, debounce));
        }

        return this._elementSubscriptions!;
    }

    private getManipulationProxy(): ElementManipulations {
        if (Helpers.isUndefined(this._elementManipulations)) {
            this._elementManipulations = new ElementManipulations(new ElementPropertiesManipulations((propertyKey) => this.properties.get(propertyKey),
                                                                                                     (propertyKey, propertyValue) => {
                                                                                                         this.properties.set(propertyKey, propertyValue);
                                                                                                         if (this.properties.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                     }),
                                                                  new ElementAttributesManipulations(attributeName => this.attributes.has(attributeName),
                                                                                                     attributeName => <string | undefined>this.attributes.get(attributeName),
                                                                                                     () => this.attributes.getAll(),
                                                                                                     (attributeName, value) => {
                                                                                                         this.attributes.set(attributeName, value);
                                                                                                         if (this.attributes.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                     },
                                                                                                     attributeName => {
                                                                                                         this.attributes.remove(attributeName);
                                                                                                         if (this.attributes.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                     }),
                                                                  new ElementStylesManipulations(propertyName => this.styles.has(propertyName),
                                                                                                 propertyName => this.styles.get(propertyName),
                                                                                                 () => this.styles.getAll(),
                                                                                                 (propertyName, propertyValue) => {
                                                                                                         this.styles.set(propertyName, propertyValue);
                                                                                                         if (this.styles.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                 },
                                                                                                 propertyName => {
                                                                                                         this.styles.remove(propertyName);
                                                                                                         if (this.styles.isDirty) {
                                                                                                             this._contextBinder.detectChanges();
                                                                                                         }
                                                                                                 }),
                                                                  new ElementClassesManipulations(className => this.classes.has(className),
                                                                                                  () => this.classes.getAll(),
                                                                                                  className => {
                                                                                                      this.classes.add(className);
                                                                                                      if (this.classes.isDirty) {
                                                                                                          this._contextBinder.detectChanges();
                                                                                                      }
                                                                                                  },
                                                                                                  className => {
                                                                                                      this.classes.remove(className);
                                                                                                      if (this.classes.isDirty) {
                                                                                                          this._contextBinder.detectChanges();
                                                                                                      }
                                                                                                  },
                                                                                                  className => {
                                                                                                      this.classes.toggle(className);
                                                                                                      if (this.classes.isDirty) {
                                                                                                          this._contextBinder.detectChanges();
                                                                                                      }
                                                                                                  }));
        }

        return this._elementManipulations!;
    }

    public static isNApplicable(nativeElement: Element): boolean {
        return Attributes.isNApplicable(nativeElement) || Component.isNApplicable(nativeElement);
    }
}