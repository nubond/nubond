/**
* Injectable.
*/
export interface IInjectable extends Object {
}

/**
* Injectable constructor.
*/
export interface IInjectableConstructor {
    //new(...injections: Array<IInjectableConstructor>): IInjectable;
    new(...injections: Array<any>): IInjectable;
}