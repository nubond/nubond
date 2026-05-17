import { IContext } from './IContext';

/**
* Context lifecycle events.
*/
export interface IContextWithEvents {
    /**
    * Invoked when the container is attached.
    *
    * @param context context
    */
    onContainerAttached?: (context: IContext) => void;
    /**
    * Invoked when the container is detached.
    *
    * @param context context
    */
    onContainerDetached?: (context: IContext) => void;
    
    /**
    * Invoked after all inputs have been refreshed.
    */
    onInputsRefreshDone?: () => void;

    /**
    * Invoked after a change-detection cycle completes.
    */
    onDetectChangesDone?: () => void;
    
    /**
    * Invoked when the context is disposed.
    */
    onDispose?: () => void;
}