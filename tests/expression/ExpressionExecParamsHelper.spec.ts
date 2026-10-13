import { ExpressionExecParamsHelper, ExecutionParams } from '../../src/expression/ExpressionExecParamsHelper';

// ExecutionParams is built incrementally (add / addOrReplace); this keeps the specs terse.
function createParams(names: Array<string>, values: Array<any>): ExecutionParams {
    const params = new ExecutionParams();
    names.forEach((name, index) => params.add(name, values[index]));
    return params;
}

// Mock Environment (only the router is read here - transformers are no longer part of the params)
jest.mock('../../src/Environment', () => ({
    Environment: {
        router: { isConfigured: false }
    }
}));

describe('ExpressionExecParamsHelper', () => {
    describe('transformers are not part of the params', () => {
        // The transformer tail used to be appended to a fresh copy of the params on every
        // evaluation (createOrExtendExecParams, removed). Transformers are now the parameters of
        // the outer compiled function (ExpressionExecutor.compileFunction), so no helper adds them.
        it('should no longer expose createOrExtendExecParams', () => {
            expect((ExpressionExecParamsHelper as any).createOrExtendExecParams).toBeUndefined();
        });
    });

    describe('createOrExtendRepeatParams', () => {
        const identityNameResolver = (paramName: string) => paramName;
        const prefixedNameResolver = (prefix: string) => (paramName: string) =>
            `${prefix}${paramName.charAt(0).toUpperCase()}${paramName.substring(1)}`;

        it('should add item, index, count params', () => {
            const result = ExpressionExecParamsHelper.createOrExtendRepeatParams(
                'apple', 0, 3, identityNameResolver, undefined
            );

            expect(result.names).toContain('item');
            expect(result.names).toContain('index');
            expect(result.names).toContain('count');

            const itemIdx = result.names.indexOf('item');
            expect(result.values[itemIdx]).toBe('apple');

            const indexIdx = result.names.indexOf('index');
            expect(result.values[indexIdx]).toBe(0);

            const countIdx = result.names.indexOf('count');
            expect(result.values[countIdx]).toBe(3);
        });

        it('should add prefixed params when name resolver provides a prefix', () => {
            const result = ExpressionExecParamsHelper.createOrExtendRepeatParams(
                'data', 1, 5, prefixedNameResolver('outer'), undefined
            );

            expect(result.names).toContain('outerItem');
            expect(result.names).toContain('outerIndex');
            expect(result.names).toContain('outerCount');
        });

        it('should extend existing params', () => {
            const existing = createParams(['myParam'], ['myValue']);
            const result = ExpressionExecParamsHelper.createOrExtendRepeatParams(
                'item1', 2, 10, identityNameResolver, existing
            );

            expect(result.names).toContain('myParam');
            expect(result.names).toContain('item');
        });

        it('should replace existing loop params if they already exist', () => {
            const existing = createParams(['item', 'index', 'count'], ['old', 0, 1]);
            const result = ExpressionExecParamsHelper.createOrExtendRepeatParams(
                'new', 5, 10, identityNameResolver, existing
            );

            const itemIdx = result.names.indexOf('item');
            expect(result.values[itemIdx]).toBe('new');

            const indexIdx = result.names.indexOf('index');
            expect(result.values[indexIdx]).toBe(5);
        });
    });

    describe('createOrExtendEventExecParams', () => {
        it('should add event-related params', () => {
            const nativeElement = document.createElement('div');
            const manipulations = {} as any;
            const event = new Event('click');
            const unsub = jest.fn();

            const result = ExpressionExecParamsHelper.createOrExtendEventExecParams(
                nativeElement, manipulations, event, unsub, undefined
            );

            expect(result.names).toContain('nativeElement');
            expect(result.names).toContain('element');
            expect(result.names).toContain('event');
            expect(result.names).toContain('data');
            expect(result.names).toContain('unSubscribe');

            const elemIdx = result.names.indexOf('nativeElement');
            expect(result.values[elemIdx]).toBe(nativeElement);

            const evtIdx = result.names.indexOf('event');
            expect(result.values[evtIdx]).toBe(event);
        });

        it('should extend existing params for event exec', () => {
            const nativeElement = document.createElement('div');
            const manipulations = {} as any;
            const event = new Event('click');
            const unsub = jest.fn();
            const existing = createParams(['myParam'], ['myValue']);

            const result = ExpressionExecParamsHelper.createOrExtendEventExecParams(
                nativeElement, manipulations, event, unsub, existing
            );

            expect(result.names).toContain('myParam');
            expect(result.names).toContain('nativeElement');
            expect(result.names).toContain('unSubscribe');
        });

        it('should extract detail from CustomEvent into data param', () => {
            const nativeElement = document.createElement('div');
            const manipulations = {} as any;
            const event = new CustomEvent('my-event', { detail: { foo: 'bar' } });
            const unsub = jest.fn();

            const result = ExpressionExecParamsHelper.createOrExtendEventExecParams(
                nativeElement, manipulations, event, unsub, undefined
            );

            const dataIdx = result.names.indexOf('data');
            expect(result.values[dataIdx]).toEqual({ foo: 'bar' });
        });

        it('should set data to undefined for non-CustomEvent', () => {
            const nativeElement = document.createElement('div');
            const manipulations = {} as any;
            const event = new Event('click');
            const unsub = jest.fn();

            const result = ExpressionExecParamsHelper.createOrExtendEventExecParams(
                nativeElement, manipulations, event, unsub, undefined
            );

            const dataIdx = result.names.indexOf('data');
            expect(result.values[dataIdx]).toBeUndefined();
        });

        it('should include router param when router is configured', () => {
            const EnvironmentModule = jest.requireMock<{ Environment: { router: { isConfigured: boolean } } }>('../../src/Environment');
            EnvironmentModule.Environment.router.isConfigured = true;

            try {
                const nativeElement = document.createElement('div');
                const manipulations = {} as any;
                const event = new Event('click');
                const unsub = jest.fn();

                const result = ExpressionExecParamsHelper.createOrExtendEventExecParams(
                    nativeElement, manipulations, event, unsub, undefined
                );

                expect(result.names).toContain('router');
                const routerIdx = result.names.indexOf('router');
                expect(result.values[routerIdx]).toBe(EnvironmentModule.Environment.router);
            } finally {
                EnvironmentModule.Environment.router.isConfigured = false;
            }
        });
    });

    describe('createOrExtendBoundExecParams', () => {
        it('should add nativeElement and element params', () => {
            const nativeElement = document.createElement('div');
            const manipulations = {} as any;

            const result = ExpressionExecParamsHelper.createOrExtendBoundExecParams(
                nativeElement, manipulations, undefined
            );

            expect(result.names).toContain('nativeElement');
            expect(result.names).toContain('element');

            const elemIdx = result.names.indexOf('nativeElement');
            expect(result.values[elemIdx]).toBe(nativeElement);
        });

        it('should extend existing params for bound exec', () => {
            const nativeElement = document.createElement('div');
            const manipulations = {} as any;
            const existing = createParams(['existingKey'], ['existingVal']);

            const result = ExpressionExecParamsHelper.createOrExtendBoundExecParams(
                nativeElement, manipulations, existing
            );

            expect(result.names).toContain('existingKey');
            expect(result.names).toContain('nativeElement');
            expect(result.names).toContain('element');
        });
    });

    describe('createOrExtendVarExecParams', () => {
        it('should add variable map entries as params', () => {
            const vars = new Map<string, any>();
            vars.set('myVar', 42);
            vars.set('anotherVar', 'hello');

            const result = ExpressionExecParamsHelper.createOrExtendVarExecParams(vars, undefined);

            expect(result.names).toContain('myVar');
            expect(result.names).toContain('anotherVar');

            const myVarIdx = result.names.indexOf('myVar');
            expect(result.values[myVarIdx]).toBe(42);
        });

        it('should extend existing params', () => {
            const existing = createParams(['existing'], [99]);
            const vars = new Map<string, any>();
            vars.set('newVar', 'val');

            const result = ExpressionExecParamsHelper.createOrExtendVarExecParams(vars, existing);

            expect(result.names).toContain('existing');
            expect(result.names).toContain('newVar');
        });

        it('should replace an existing param with the same name (no duplicates)', () => {
            // A nested nb-var must shadow an outer var with the same name. The helper replaces the
            // value in place (ExecutionParams.addOrReplace), so the name keeps its position and no
            // stale entry is left behind.
            const existing = createParams(['x', 'y'], [1, 2]);
            const vars = new Map<string, any>();
            vars.set('x', 99);

            const result = ExpressionExecParamsHelper.createOrExtendVarExecParams(vars, existing);

            // 'x' must appear exactly once with the new value
            const xCount = result.names.filter(n => n === 'x').length;
            expect(xCount).toBe(1);
            const xIdx = result.names.indexOf('x');
            expect(result.values[xIdx]).toBe(99);

            // Unrelated 'y' is preserved
            expect(result.names).toContain('y');
            const yIdx = result.names.indexOf('y');
            expect(result.values[yIdx]).toBe(2);
        });

        it('should not mutate the input params when replacing a name', () => {
            const existing = createParams(['x'], [1]);
            const vars = new Map<string, any>();
            vars.set('x', 999);

            ExpressionExecParamsHelper.createOrExtendVarExecParams(vars, existing);

            expect(existing.names).toEqual(['x']);
            expect(existing.values).toEqual([1]);
        });

        it('should keep names and values index-aligned when replacing multiple existing entries', () => {
            const existing = createParams(['a', 'b', 'c'], ['A', 'B', 'C']);
            const vars = new Map<string, any>();
            vars.set('b', 'B2');
            vars.set('a', 'A2');

            const result = ExpressionExecParamsHelper.createOrExtendVarExecParams(vars, existing);

            expect(result.names.length).toBe(result.values.length);

            const expectValueFor = (name: string, expected: any) => {
                const idx = result.names.indexOf(name);
                expect(idx).toBeGreaterThanOrEqual(0);
                expect(result.values[idx]).toBe(expected);
                expect(result.names.lastIndexOf(name)).toBe(idx); // exactly one occurrence
            };

            expectValueFor('a', 'A2');
            expectValueFor('b', 'B2');
            expectValueFor('c', 'C');
        });
    });

    describe('ExecutionParams', () => {
        it('should start empty', () => {
            const params = new ExecutionParams();

            expect(params.names).toEqual([]);
            expect(params.values).toEqual([]);
            expect(params.identity).toBe('');
        });

        it('should store names and values', () => {
            const params = createParams(['a', 'b'], [1, 2]);
            expect(params.names).toEqual(['a', 'b']);
            expect(params.values).toEqual([1, 2]);
        });

        it('add should append in call order and keep names and values index-aligned', () => {
            const params = new ExecutionParams();

            params.add('first', 1);
            params.add('second', undefined);
            params.add('third', null);

            expect(params.names).toEqual(['first', 'second', 'third']);
            expect(params.values).toEqual([1, undefined, null]);
        });

        it('addOrReplace should replace the value in place and keep the position', () => {
            const params = createParams(['a', 'b', 'c'], ['A', 'B', 'C']);

            params.addOrReplace('b', 'B2');

            expect(params.names).toEqual(['a', 'b', 'c']);
            expect(params.values).toEqual(['A', 'B2', 'C']);
        });

        it('addOrReplace should append a name that is not there yet', () => {
            const params = createParams(['a'], ['A']);

            params.addOrReplace('b', 'B');

            expect(params.names).toEqual(['a', 'b']);
            expect(params.values).toEqual(['A', 'B']);
        });

        it('clone should copy names, values and identity without sharing the arrays', () => {
            const original = createParams(['a', 'b'], [1, 2]);
            const copy = original.clone();

            expect(copy).not.toBe(original);
            expect(copy.names).toEqual(['a', 'b']);
            expect(copy.values).toEqual([1, 2]);
            expect(copy.identity).toBe(original.identity);

            copy.add('c', 3);
            copy.addOrReplace('a', 100);

            expect(original.names).toEqual(['a', 'b']);
            expect(original.values).toEqual([1, 2]);
        });

        describe('identity (the scope part of the compiled-function cache key)', () => {
            it('should be the same for the same names in the same order, whatever the values', () => {
                expect(createParams(['a', 'b'], [1, 2]).identity)
                    .toBe(createParams(['a', 'b'], ['x', {}]).identity);
            });

            it('should not change when a value is replaced', () => {
                const params = createParams(['a', 'b'], [1, 2]);
                const before = params.identity;

                params.addOrReplace('a', 100);

                expect(params.identity).toBe(before);
            });

            it('should change when a name is added', () => {
                const params = createParams(['a'], [1]);
                const before = params.identity;

                params.add('b', 2);

                expect(params.identity).not.toBe(before);
            });

            it('should differ for the same names in a different order', () => {
                expect(createParams(['a', 'b'], [1, 2]).identity)
                    .not.toBe(createParams(['b', 'a'], [2, 1]).identity);
            });

            // The positional signature of the compiled function is exactly the names list, so two
            // different lists must never share an identity.
            it.each([
                [['ab', 'c'], ['a', 'bc']],
                [['a', 'b'], ['ab']],
                [['a', 'b', 'ab'], ['ab', 'a', 'b']],
            ])('should differ for %j and %j', (first, second) => {
                expect(createParams(first, first.map(() => 0)).identity)
                    .not.toBe(createParams(second, second.map(() => 0)).identity);
            });
        });
    });
});
