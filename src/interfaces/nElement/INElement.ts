import { IClassesBindings } from './bindings/IClassesBindings';
import { IAspectBindings } from './bindings/IAspectBindings';
import { IEventsBindings } from './bindings/IEventsBindings';
import { IContextBaseBindings } from './bindings/IContextBaseBindings';

import { IHandler } from './IHandler';
import { IDisposable } from '../IDisposable';
import { IVisible } from './IVisible';
import { IVisibilityHandler } from './IVisibilityHandler';

import { IExpressionDetails } from '../expression/IExpressionDetails';
import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Attributes } from '../../nElement/handlers/Attributes';
import { Classes } from '../../nElement/handlers/Classes';
import { Styles } from '../../nElement/handlers/Styles';
import { Value } from '../../nElement/handlers/Value';
import { Html } from '../../nElement/handlers/Html';
import { If } from '../../nElement/handlers/If';
import { Events } from '../../nElement/handlers/Events';
import { Properties } from '../../nElement/handlers/Properties';
import { Repeat } from '../../nElement/handlers/Repeat';
import { Container } from '../../nElement/handlers/Container';
import { Exec } from '../../nElement/handlers/Exec';
import { Switch } from '../../nElement/handlers/switch/Switch';
import { Case } from '../../nElement/handlers/switch/Case';
import { Default } from '../../nElement/handlers/switch/Default';
import { Aspects } from '../../nElement/handlers/Aspects';
import { Component } from '../../nElement/handlers/Component';
import { Template } from '../../nElement/handlers/Template';
import { Bound } from '../../nElement/handlers/Bound';
import { Variables } from '../../nElement/handlers/Variables';

export interface INTreeElement extends IDisposable {
    readonly isSubTreeHandled: boolean;

    readonly isStable: boolean;

    readonly nativeElement: Element;

    addChild(nElement: INTreeElement): void;
    removeChild(nElement: INTreeElement): void;

    detectChanges(context: object, executionParams?: ExecutionParams): void;
}

export interface INElement extends INTreeElement {    
    readonly nativeElementForClone: Node | undefined;

    readonly attributes: Attributes & IHandler<Map<string, IExpressionDetails>>;
    readonly classes: Classes & (IHandler<IClassesBindings<IExpressionDetails> | 
                                          IClassesBindings<Array<IExpressionDetails>> | 
                                          IClassesBindings<Map<string, IExpressionDetails>>>) & 
                                 IVisibilityHandler;
    readonly styles: Styles & IHandler<Map<string, IExpressionDetails>>;
    readonly value: Value & IHandler<IExpressionDetails>;
    readonly html: Html & IHandler<IExpressionDetails>;
    readonly if: If & IHandler<IExpressionDetails> & IVisible;
    readonly events: Events & IHandler<Map<string, IEventsBindings>> & IDisposable;
    readonly properties: Properties & IHandler<Map<string, IExpressionDetails>>;
    readonly repeat: Repeat & IHandler<IExpressionDetails> & IVisible;
    readonly exec: Exec & IHandler<IExpressionDetails>;
    readonly switch: Switch & IHandler<IExpressionDetails> & IVisible;
    readonly case: Case & IHandler<IExpressionDetails> & IDisposable;
    readonly default: Default & IHandler<IExpressionDetails> & IDisposable;
    readonly bound: Bound & IHandler<IExpressionDetails>;
    readonly variables: Variables & IHandler<Map<string, IExpressionDetails>>;

    readonly container: Container & IHandler<IContextBaseBindings> & IDisposable;
    readonly component: Component & IHandler<IContextBaseBindings> & IDisposable;
    readonly aspects: Aspects & IHandler<Map<string, IAspectBindings>> & IDisposable;
    readonly template: Template & IHandler<IExpressionDetails>;
}