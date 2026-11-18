import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IVisible } from '../../interfaces/nElement/IVisible';
import { IDisposable } from '../../interfaces/IDisposable';

import { INElement } from '../../interfaces/nElement/INElement';

import { IContextBinder } from '../../interfaces/contextBinders/IContextBinder';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Constants } from '../../Constants';
import { Helpers } from '../../Helpers';

export class Projection extends Base implements IHandler<IExpressionDetails | undefined>, IVisible, IDisposable {
    private readonly _immediateParent: INElement | undefined;

    private _unsubscribeFromOnDispose: (() => void) | undefined;

    public get isVisible(): boolean {
        let result = true;
        if (this.hasNExpression) {
            let parent = this._immediateParent;
            while ((parent != null) && result) {
                result = result && parent.isVisible;
                parent = <INElement>parent.parent;
            }
        }
        
        return result;
    }

    public readonly nExpression: IExpressionDetails | undefined;
    public readonly hasNExpression: boolean;

    public readonly isDirty = false;

    constructor(immediateParent: INElement | undefined, attributes: Attributes,
                contextBinder: IContextBinder,
                disposeNElement: () => void) {
        super();
        
        if (attributes.has(Constants.HANDLERS.PROJECTION_ATTRIBUTE_NAME, true) && !Helpers.isUndefined(immediateParent)) {
            this.hasNExpression = true;
            this._immediateParent = immediateParent;
            this._unsubscribeFromOnDispose = immediateParent!.onDispose(() => disposeNElement!());
            contextBinder.detectChanges();
        } else {
            this.hasNExpression = false;
        }
    }

    public bind(executionParams: ExecutionParams | undefined,
                executeExpression: (expression: string | null | undefined, 
                                    executionParams: ExecutionParams | undefined) => any): ExecutionParams | undefined {
        return executionParams;
    }
    
    public commit(): boolean {
        return false;
    }

    public dispose(): void {
        if (Helpers.isFunction(this._unsubscribeFromOnDispose)) {
            this._unsubscribeFromOnDispose!();
            this._unsubscribeFromOnDispose = undefined;
        }
    }
}