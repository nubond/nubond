import { ITransformerContext, ITransformerContextConstructor } from '../interfaces/contexts/ITransformerContext'; 

import { IInjectableConstructor } from '../interfaces/IInjectable';

import { Injectables } from './Injectables';

import { Constants } from '../Constants';
import { Console } from '../Console';

export class Transformers {
    private readonly _namesSet = new Set<string>();
    private readonly _names: Array<string> = [];
    private readonly _functions: Array<(...params: Array<any>) => any> = [];
    public get instances(): [names: ReadonlyArray<string>, functions: ReadonlyArray<(...params: Array<any>) => any>] {
        return [this._names, this._functions];
    }

    constructor(private _injectables: Injectables) {
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

        this._injectables.register(transformer, dependencies, true);
        this._names.push(name);
        this._namesSet.add(lowerCasedName);

        const that = this;
        this._functions.push(function () {
            try {
                const context = <ITransformerContext>that._injectables.resolve(transformer);
                return context.transform.apply(context, [...arguments]);
            } catch (ex) {
                Console.error(`Transformer '${name}' failed with exception: ${ex}`);
            }
        });
    }

    public has(name: string): boolean {
        const lowerCasedName = name.toLowerCase();
        return this._namesSet.has(lowerCasedName);
    }
}