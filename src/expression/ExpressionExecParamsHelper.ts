import { Environment } from '../Environment';

import { ElementManipulations } from '../models/injections/ElementManipulations';

import { Helpers } from '../Helpers';
import { Constants } from '../Constants';

export class ExecutionParams {
    public readonly names: Array<string>;
    public readonly values: Array<any>;

    constructor(names: Array<string>, values: Array<any>) {
        this.names = names;
        this.values = values;
    }
}

//TODO: optimize name\value array management
export class ExpressionExecParamsHelper {
    private constructor() {}
    
    public static createOrExtendExecParams(executionParams?: ExecutionParams): ExecutionParams {
        let names: Array<string>;
        let values: Array<any>;

        if (Helpers.isUndefined(executionParams)) {
            names = [];
            values = [];
        } else {
            names = executionParams!.names.slice();
            values = executionParams!.values.slice();
        }

        const [functionsNames, functions] = Environment.transformers.instances;

        names.push(...functionsNames);
        
        values.push(...functions);

        return new ExecutionParams(names, values);
    }
    
    public static createOrExtendRepeatParams(item: any, index: number, totalCount: number,
                                             getContextParameterName: (parameterName: string) => string,
                                             executionParams: ExecutionParams | undefined): ExecutionParams {
        let names: Array<string>;
        let values: Array<any>;

        if (Helpers.isUndefined(executionParams)) {
            names = [];
            values = [];
        } else {
            names = executionParams!.names.slice();
            values = executionParams!.values.slice();
        }

        const itemParamName = getContextParameterName(Constants.ITEM_EXECUTION_PARAM_NAME);
        const indexParamName = getContextParameterName(Constants.INDEX_EXECUTION_PARAM_NAME);
        const totalCountParamName = getContextParameterName(Constants.TOTAL_COUNT_EXECUTION_PARAM_NAME);

        const itemParamIndex = names.indexOf(itemParamName);
        if (itemParamIndex >= 0) {
            names.splice(itemParamIndex, 1);
            values.splice(itemParamIndex, 1);
        }

        const indexParamIndex = names.indexOf(indexParamName);
        if (indexParamIndex >= 0) {
            names.splice(indexParamIndex, 1);
            values.splice(indexParamIndex, 1);
        }

        const totalCountParamIndex = names.indexOf(totalCountParamName);
        if (totalCountParamIndex >= 0) {
            names.splice(totalCountParamIndex, 1);
            values.splice(totalCountParamIndex, 1);
        }

        names.push(itemParamName);
        names.push(indexParamName);
        names.push(totalCountParamName);

        values.push(item);
        values.push(index);
        values.push(totalCount);

        return new ExecutionParams(names, values);
    }

    public static createOrExtendEventExecParams(nativeElement: Element, elementManipulations: ElementManipulations,
                                                evt: Event, unSubscribe: () => void, 
                                                executionParams: ExecutionParams | undefined): ExecutionParams {
        let names: Array<string>;
        let values: Array<any>;

        if (Helpers.isUndefined(executionParams)) {
            names = [];
            values = [];
        } else {
            names = executionParams!.names.slice();
            values = executionParams!.values.slice();
        }

        const unSubscribeFn = function() { unSubscribe(); };

        names.push(Constants.NATIVE_ELEMENT_EXECUTION_PARAM_NAME);
        names.push(Constants.ELEMENT_EXECUTION_PARAM_NAME);
        names.push(Constants.EVENT_EXECUTION_PARAM_NAME);
        names.push(Constants.DATA_EXECUTION_PARAM_NAME);
        names.push(Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME);

        values.push(nativeElement);
        values.push(elementManipulations);
        values.push(evt);
        values.push(evt instanceof CustomEvent ? (<CustomEvent>evt).detail : undefined); //TODO: check events
        values.push(unSubscribeFn);

        if (Environment.router!.isConfigured) {
            names.push(Constants.ROUTER_EXECUTION_PARAM_NAME);
            values.push(Environment.router);
        }

        return new ExecutionParams(names, values);
    }

    public static createOrExtendBoundExecParams(nativeElement: Element, elementManipulations: ElementManipulations, 
                                                executionParams: ExecutionParams | undefined): ExecutionParams {
        let names: Array<string>;
        let values: Array<any>;

        if (Helpers.isUndefined(executionParams)) {
            names = [];
            values = [];
        } else {
            names = executionParams!.names.slice();
            values = executionParams!.values.slice();
        }

        names.push(Constants.NATIVE_ELEMENT_EXECUTION_PARAM_NAME);
        names.push(Constants.ELEMENT_EXECUTION_PARAM_NAME);

        values.push(nativeElement);
        values.push(elementManipulations);

        return new ExecutionParams(names, values);
    }

    public static createOrExtendVarExecParams(data: Map<string, any>, executionParams: ExecutionParams | undefined): ExecutionParams {
        let names: Array<string>;
        let values: Array<any>;

        if (Helpers.isUndefined(executionParams)) {
            names = [];
            values = [];
        } else {
            names = executionParams!.names.slice();
            values = executionParams!.values.slice();
        }

        for (const [key, value] of data) {
            //check if same name already exists
            const keyIndex = names.indexOf(key);
            if (keyIndex >= 0) {
                names.splice(keyIndex, 1);
                values.splice(keyIndex, 1);
            }

            names.push(key);
            values.push(value);
        }

        return new ExecutionParams(names, values);
    }
}