import { IInjectableConstructor } from '../../interfaces/IInjectable';

/**
* Transformer context.
*/
export interface ITransformerContext extends Object {
    /**
    * Transform data.
    *
    * @param params transformer parameters
    * @returns transformed data
    */
    transform(...params: Array<any>): any;
}

/**
* Transformer context constructor.
*/
export interface ITransformerContextConstructor {
    //new(...injections: Array<IInjectableConstructor>): ITransformerContext;
    new(...injections: Array<any>): ITransformerContext;
}