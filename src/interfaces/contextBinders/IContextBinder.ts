import { IDisposable } from './../IDisposable';

import { INElement } from '../nElement/INElement';

import { IContext } from './../contexts/IContext';
import { IComponentContext } from './../contexts/IComponentContext';

import { ExpressionExecutor } from '../../expression/ExpressionExecutor';

export interface IContextBinder extends IDisposable {
    readonly parent: IContextBinder | null;
    readonly parentNElement: INElement | null;
    readonly context: IContext | IComponentContext | undefined;

    readonly changeDetectionEnabled: boolean;

    readonly getShowDebugInfo: () => boolean;
    readonly getHiddenClassName: () => string;
    readonly htmlSanitizer: ((html: string) => string) | undefined;

    readonly expressionExecutor: ExpressionExecutor;

    enableChangeDetection(): void;
    disableChangeDetection(): void;
    
    detectChanges(): void;
    inputsRefreshIsDone(): void;

    containerAttached(context: object): void;
    containerDetached(context: object): void;
    onDispose(onDisposeCallBack: () => void): () => void;    
}