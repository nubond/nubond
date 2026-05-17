import { IInjectable, IInjectableConstructor } from '../interfaces/IInjectable';
import { IContext, IContextConstructor } from '../interfaces/contexts/IContext';
import { IComponentContext, IComponentContextConstructor } from '../interfaces/contexts/IComponentContext';
import { IAspectContext, IAspectContextConstructor } from '../interfaces/contexts/IAspectContext';
import { ITransformerContext, ITransformerContextConstructor } from '../interfaces/contexts/ITransformerContext';

import { Helpers } from '../Helpers';
import { Console } from '../Console';

class InjectableMetaData {
    public readonly injectable: IInjectableConstructor | IContextConstructor | IComponentContextConstructor | IAspectContextConstructor | ITransformerContextConstructor;
    public readonly dependencies: Array<ObjectConstructor | IInjectableConstructor>;
    public readonly singleton: boolean;

    public instance: IInjectable | IContext | IComponentContext| IAspectContext | ITransformerContext | undefined;

    constructor(injectable: IInjectableConstructor | IContextConstructor | IComponentContextConstructor | IAspectContextConstructor | ITransformerContextConstructor, 
                dependencies: Array<ObjectConstructor | IInjectableConstructor>, instanceOrSingletonFlag?: object | boolean) {
        this.injectable = injectable;
        this.dependencies = dependencies;

        if (Helpers.isObject(instanceOrSingletonFlag)) {
            this.singleton = true;
            this.instance = <object>instanceOrSingletonFlag;
        } else {
            this.singleton = Helpers.isBoolean(instanceOrSingletonFlag) && <boolean>instanceOrSingletonFlag;
        }
    }
}

export class Injectables {
    private readonly _data = new Map<IInjectableConstructor | IContextConstructor | IComponentContextConstructor | IAspectContextConstructor | ITransformerContextConstructor, InjectableMetaData>();

    public resolve(injectable: IInjectableConstructor | IContextConstructor | IComponentContextConstructor | IAspectContextConstructor,
                   ...contextDependantInjections: Array<object>): IInjectable | IContext | IComponentContext| IAspectContext | undefined {
        const injectableMetaData = this._data.get(injectable);

        if (!Helpers.isUndefined(injectableMetaData)) {
            return this.resolveInternal(injectableMetaData!, contextDependantInjections);
        } else {
            Console.error(`Injection '${injectable.name}' cannot be resolve.`);
        }
    }
    
    public add(instance: IInjectable): () => void {
        const constructor = <IInjectableConstructor>instance.constructor;
        if (this._data.has(constructor)) {
            Console.error(`Injection '${constructor.name}' already exists, injection should be unique.`);
            return () => {};
        }

        this._data.set(constructor, new InjectableMetaData(constructor, [], instance));

        const that = this;
        return function() {
            that._data.delete(constructor);
        };
    }

    public register(injectable: IInjectableConstructor | IContextConstructor | IComponentContextConstructor | IAspectContextConstructor | ITransformerContextConstructor,
                    dependencies: Array<ObjectConstructor | IInjectableConstructor>, singleton: boolean = false): () => void {
        if (this._data.has(injectable)) {
            Console.error(`Injection '${injectable.name}' already exists, injection should be unique.`);
            return () => {};
        }

        this._data.set(injectable, new InjectableMetaData(injectable, dependencies, singleton));

        const that = this;
        return function() {
            that._data.delete(injectable);
        };
    }

    private resolveInternal(injectableMetaData: InjectableMetaData, contextDependantInjections?: Array<object>): IInjectable | IContext | IComponentContext| IAspectContext | ITransformerContext | undefined {
        let instance: IInjectable | IContext | IComponentContext| IAspectContext | ITransformerContext | undefined = injectableMetaData.instance;

        if (Helpers.isUndefined(instance)) {
            const injections: Array<IInjectable | IContext | IComponentContext | IAspectContext | ITransformerContext | undefined> = [];

            for (const dependency of injectableMetaData.dependencies) {
                const dependencyMetaData = this._data.get(dependency);
                if (!Helpers.isUndefined(dependencyMetaData)) { //regular injection
                    const resolvedDependency = this.resolveInternal(dependencyMetaData!);

                    if (Helpers.isUndefined(resolvedDependency)) {
                        Console.error(`Injection '${dependency.name}' cannot be resolve.`);
                    }

                    injections.push(resolvedDependency);
                } else if (Helpers.isArray(contextDependantInjections) && contextDependantInjections!.length > 0) { //context-dependant injection
                    let contextDependency = contextDependantInjections!.find(el => el instanceof dependency);

                    //when custom element has custom defined class and it is requested to be injected
                    //TODO: find a better solution
                    if (Helpers.isUndefined(contextDependency) && HTMLElement.isPrototypeOf(dependency)) {
                        contextDependency = contextDependantInjections!.find(el => el instanceof HTMLElement);
                    }

                    if (Helpers.isUndefined(contextDependency)) {
                        Console.error(`Injection '${dependency.name}' cannot be resolve.`);
                    }

                    injections.push(contextDependency);
                } else {
                    injections.push(undefined);
                    Console.error(`Injection '${dependency.name}' cannot be resolve.`);
                }
            }

                            //TODO: Check typings?
            instance = new (<ObjectConstructor>injectableMetaData.injectable)(...injections);

            if (injectableMetaData.singleton) {
                injectableMetaData.instance = instance;
            }
        }

        return instance;
    }
}