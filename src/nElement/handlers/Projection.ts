import { IExpressionDetails } from '../../interfaces/expression/IExpressionDetails';

import { IHandler } from '../../interfaces/nElement/IHandler';
import { IConstructable } from '../../interfaces/nElement/IConstructable';
import { IVisible } from '../../interfaces/nElement/IVisible';
import { IDisposable } from '../../interfaces/IDisposable';

import { INElement } from '../../interfaces/nElement/INElement';

import { Base } from './base/Base';

import { Attributes } from './Attributes';

import { ExecutionParams } from '../../expression/ExpressionExecParamsHelper';

import { Constants } from '../../Constants';
import { Helpers } from '../../Helpers';

export class Projection extends Base implements IHandler<IExpressionDetails>, IConstructable, IVisible, IDisposable {
    private readonly _immediateParent: INElement | undefined;
    private readonly _disposeNElement: (() => void) | undefined;

    private _requestDetectChanges: (() => void) | undefined;

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
                requestDetectChanges: () => void,
                disposeNElement: () => void) {
        super();
        
        if (attributes.has(Constants.PROJECTION_ATTRIBUTE_NAME, true) && !Helpers.isUndefined(immediateParent)) {
            this.hasNExpression = true;
            this._immediateParent = immediateParent;
            this._requestDetectChanges = requestDetectChanges;
            this._disposeNElement = disposeNElement;
        } else {
            this.hasNExpression = false;
        }
    }

    public construct(): void {
        if (this.hasNExpression) {
            this._unsubscribeFromOnDispose = this._immediateParent!.onDispose(() => this._disposeNElement!());

            this._requestDetectChanges!();

            delete this._requestDetectChanges;
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
            delete this._unsubscribeFromOnDispose;
        }
    }
}