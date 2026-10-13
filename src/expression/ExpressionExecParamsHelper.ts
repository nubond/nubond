import { Environment } from '../Environment';

import { ElementManipulations } from '../models/injections/ElementManipulations';

import { Helpers } from '../Helpers';
import { Constants } from '../Constants';

export class ExecutionParams {
    private _identity: string = '';

    public get identity(): string {
        return this._identity;
    }

    private _names: Array<string> = [];
    public get names(): ReadonlyArray<string> {
        return this._names;
    }

    private _values: Array<any> = [];
    public get values(): ReadonlyArray<any> {
        return this._values;
    }

    public add(name: string, value: any): void {
        this._names.push(name);
        this._values.push(value);
        this._identity += `${name},`;
    }

    public addOrReplace(name: string, value: any): void {
        const index = this._names.indexOf(name);
        if (index >= 0) {
            this._values[index] = value;
        } else {
            this.add(name, value);
        }
    }

    // public remove(name: string): boolean {
    //     const index = this._names.indexOf(name);
    //     if (index >= 0) {
    //         this._names.splice(index, 1);
    //         this._values.splice(index, 1);

    //         return true;
    //     } else {
    //         return false;
    //     }
    // }

    public clone(): ExecutionParams {
        const result = new ExecutionParams();
        
        result._identity = this._identity;
        result._names = this._names.slice();
        result._values = this._values.slice();

        return result;
    }
}

//TODO: optimize name\value array management
export class ExpressionExecParamsHelper {
    private constructor() {}
    
    public static createOrExtendRepeatParams(item: any, index: number, totalCount: number,
                                             getContextParameterName: (parameterName: string) => string,
                                             executionParams: ExecutionParams | undefined): ExecutionParams {
        let result: ExecutionParams;

        const itemParamName = getContextParameterName(Constants.ITEM_EXECUTION_PARAM_NAME);
        const indexParamName = getContextParameterName(Constants.INDEX_EXECUTION_PARAM_NAME);
        const totalCountParamName = getContextParameterName(Constants.TOTAL_COUNT_EXECUTION_PARAM_NAME);

        if (Helpers.isUndefined(executionParams)) {
            result = new ExecutionParams();

            result.add(itemParamName, item);
            result.add(indexParamName, index);
            result.add(totalCountParamName, totalCount);
        } else {
            result = executionParams!.clone();

            result.addOrReplace(itemParamName, item);
            result.addOrReplace(indexParamName, index);
            result.addOrReplace(totalCountParamName, totalCount);
        }

        return result;
    }

    public static createOrExtendEventExecParams(nativeElement: Element, elementManipulations: ElementManipulations,
                                                evt: Event, unSubscribe: () => void, 
                                                executionParams: ExecutionParams | undefined): ExecutionParams {
        let result: ExecutionParams;

        if (Helpers.isUndefined(executionParams)) {
            result = new ExecutionParams();
        } else {
            result = executionParams!.clone();
        }

        result.add(Constants.NATIVE_ELEMENT_EXECUTION_PARAM_NAME, nativeElement);
        result.add(Constants.ELEMENT_EXECUTION_PARAM_NAME, elementManipulations);
        result.add(Constants.EVENT_EXECUTION_PARAM_NAME, evt);
        result.add(Constants.DATA_EXECUTION_PARAM_NAME, evt instanceof CustomEvent ? (<CustomEvent>evt).detail : undefined); //TODO: check events
        result.add(Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME, function () { unSubscribe(); });

        if (!Helpers.isUndefined(Environment.router) && Environment.router!.isConfigured) {
            result.add(Constants.ROUTER_EXECUTION_PARAM_NAME, Environment.router);
        }

        return result;
    }

    public static createOrExtendBoundExecParams(nativeElement: Element, elementManipulations: ElementManipulations, 
                                                executionParams: ExecutionParams | undefined): ExecutionParams {
        let result: ExecutionParams;

        if (Helpers.isUndefined(executionParams)) {
            result = new ExecutionParams();
        } else {
            result = executionParams!.clone();
        }

        result.add(Constants.NATIVE_ELEMENT_EXECUTION_PARAM_NAME, nativeElement);
        result.add(Constants.ELEMENT_EXECUTION_PARAM_NAME, elementManipulations);

        return result;
    }

    public static createOrExtendVarExecParams(data: Map<string, any>, executionParams: ExecutionParams | undefined): ExecutionParams {
        let result: ExecutionParams;

        if (Helpers.isUndefined(executionParams)) {
            result = new ExecutionParams();
        } else {
            result = executionParams!.clone();
        }

        for (const [key, value] of data) {
            result.addOrReplace(key, value);
        }

        return result;
    }
}