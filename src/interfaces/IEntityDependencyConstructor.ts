import { IContextConstructor } from '../interfaces/contexts/IContext';
import { IComponentContextConstructor } from '../interfaces/contexts/IComponentContext';
import { IAspectContextConstructor } from '../interfaces/contexts/IAspectContext';
import { ITransformerContextConstructor } from '../interfaces/contexts/ITransformerContext';
import { IInjectableConstructor } from '../interfaces/IInjectable';

/**
* Entity dependency constructor.
*/
export type IEntityDependencyConstructor = IContextConstructor | IComponentContextConstructor | 
                                           IAspectContextConstructor | ITransformerContextConstructor | IInjectableConstructor;