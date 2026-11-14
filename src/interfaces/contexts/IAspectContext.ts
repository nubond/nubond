import { IInjectableConstructor } from '../../interfaces/IInjectable';

import { ChangeDetector } from '../../models/injections/ChangeDetector';
import { ElementManipulations } from '../../models/injections/ElementManipulations';
import { ElementSubscriptions } from '../../models/injections/ElementSubscriptions';

/**
* Aspect context.
*/
export interface IAspectContext extends Object {
    /**
    * Aspect data.
    */
    data?: any;
    
    /**
    * Invoked when the context is disposed.
    */
    onDispose?: () => void;
}

/**
* Aspect context constructor.
*/
export interface IAspectContextConstructor {
    //new(...injections: Array<Element | ElementManipulations | ChangeDetector | ElementSubscriptions | IInjectableConstructor>): IAspectContext;
    new(...injections: Array<any>): IAspectContext;
}