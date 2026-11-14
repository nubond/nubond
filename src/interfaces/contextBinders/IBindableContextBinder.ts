import { IContextBinder } from './IContextBinder';

import { IContext } from '../contexts/IContext';
import { IComponentContext } from '../contexts/IComponentContext';

export interface IBindableContextBinder extends IContextBinder {
    bind(element: Element | ShadowRoot, context: IContext | IComponentContext, elementBindable: boolean, debounced: boolean): boolean;
}