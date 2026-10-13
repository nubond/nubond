import { ITransformerContext, ITransformerContextConstructor } from '../interfaces/contexts/ITransformerContext'; 

import { IInjectableConstructor } from '../interfaces/IInjectable';

import { Injectables } from './Injectables';

import { CallBackEvent } from '../CallBackEvent';

import { Constants } from '../Constants';
import { Console } from '../Console';
import { Helpers } from '../Helpers';

export class Transformers {
    private readonly _namesSet = new Set<string>();
    private readonly _names: Array<string> = [];
    private readonly _functions: Array<(...params: Array<any>) => any> = [];

    private readonly _onAddedCallBackEvent = new CallBackEvent<(stateIdentity: string) => void>();

    public get names(): ReadonlyArray<string> {
        return this._names;
    }

    public get functions(): ReadonlyArray<(...params: Array<any>) => any> {
        return this._functions;
    }

    constructor(private _injectables: Injectables) {
    }

    public onAdded(callBack: (name: string) => void): () => void {
        return this._onAddedCallBackEvent.subscribe(callBack);
    }
    
    public add(name: string, transformer: ITransformerContextConstructor, dependencies: Array<IInjectableConstructor>): void {
        const lowerCasedName = name.toLowerCase();

        if (this._namesSet.has(lowerCasedName)) {
            Console.error(`Transformers with '${name}' name already exists, transformer name should be case-insensitive unique.`);
            return;
        }

        if (Constants.RESERVED_CONTEXT_NAMES.has(lowerCasedName)) {
            Console.error(`Transformers with '${name}' name cannot be created, this name is reserved.`);
            return;
        }

        if (!Helpers.isValidIdentifier(name)) {
            Console.error(`Transformers with '${name}' name cannot be created, '${name}' is not a valid identifier.`);
            return;
        }

        this._injectables.register(transformer, dependencies, true);
        this._names.push(name);
        this._namesSet.add(lowerCasedName);

        const injectables = this._injectables;
        this._functions.push(function () {
            try {
                const context = <ITransformerContext>injectables.resolve(transformer);
                return context.transform.apply(context, [...arguments]);
            } catch (ex) {
                Console.error(`Transformer '${name}' failed with exception: ${ex}`);
            }
        });

        this._onAddedCallBackEvent.raise(name);
    }

    public has(name: string): boolean {
        const lowerCasedName = name.toLowerCase();
        return this._namesSet.has(lowerCasedName);
    }
}