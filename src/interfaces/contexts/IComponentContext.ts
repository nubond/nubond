import { IContextWithEvents } from './IContextWithEvents';
import { IInjectableConstructor } from '../../interfaces/IInjectable';

import { ChangeDetector } from '../../models/injections/ChangeDetector';
import { ElementManipulations } from '../../models/injections/ElementManipulations';

/**
* Component context.
*/
export interface IComponentContext extends Object, IContextWithEvents {
}

/**
* Component context constructor.
*/
export interface IComponentContextConstructor {
    //new(...injections: Array<Element | ElementManipulations | ChangeDetector | IInjectableConstructor>): IComponentContext;
    new(...injections: Array<any>): IComponentContext;
}