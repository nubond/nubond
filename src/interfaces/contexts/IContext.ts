import { IContextWithEvents } from './IContextWithEvents';
import { IInjectableConstructor } from '../../interfaces/IInjectable';

import { ChangeDetector } from '../../models/injections/ChangeDetector';
import { ElementManipulations } from '../../models/injections/ElementManipulations';

/**
* AppRoot and Container context.
*/
export interface IContext extends Object, IContextWithEvents {
}

/**
* AppRoot and Container context constructor.
*/
export interface IContextConstructor {
    //new(...injections: Array<ElementManipulations | ChangeDetector | IInjectableConstructor>): IContext;
    new(...injections: Array<any>): IContext;
}