import { ExpressionExecutor } from '../../src/expression/ExpressionExecutor';
import { ExecutionParams } from '../../src/expression/ExpressionExecParamsHelper';
import { Transformers } from '../../src/entities/Transformers';
import { Injectables } from '../../src/entities/Injectables';
import { Environment } from '../../src/Environment';

// ExecutionParams is built incrementally (add / addOrReplace); this keeps the specs terse.
function createParams(names: Array<string>, values: Array<any>): ExecutionParams {
    const params = new ExecutionParams();
    names.forEach((name, index) => params.add(name, values[index]));
    return params;
}

// Mock Environment to avoid importing the full Environment. The transformers registry is the real
// class (the executor reads its names / functions and subscribes to onAdded); it is replaced before each test.
jest.mock('../../src/Environment', () => ({
    Environment: {
        transformers: undefined as unknown,
        router: { isConfigured: false }
    }
}));

describe('ExpressionExecutor', () => {
    let executor: ExpressionExecutor;
    let element: Element;
    let transformers: Transformers;

    function addTransformer(name: string, transform: (...args: Array<any>) => any): void {
        class TransformerContext { transform(...args: Array<any>) { return transform(...args); } }
        transformers.add(name, TransformerContext as any, []);
    }

    beforeEach(() => {
        transformers = new Transformers(new Injectables());
        (Environment as any).transformers = transformers;

        executor = new ExpressionExecutor(() => false);
        element = document.createElement('div');
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('simple property access', () => {
        it('should read a simple property via this', () => {
            const ctx = { name: 'hello' };
            const result = executor.executeExpression('this.name', ctx, element);
            expect(result).toBe('hello');
        });

        it('should read a nested property via this', () => {
            const ctx = { a: { b: { c: 42 } } };
            const result = executor.executeExpression('this.a.b.c', ctx, element);
            expect(result).toBe(42);
        });
    });

    describe('arithmetic', () => {
        it('should evaluate addition', () => {
            const ctx = { x: 10, y: 5 };
            const result = executor.executeExpression('this.x + this.y', ctx, element);
            expect(result).toBe(15);
        });

        it('should evaluate multiplication', () => {
            const ctx = { x: 3, y: 4 };
            const result = executor.executeExpression('this.x * this.y', ctx, element);
            expect(result).toBe(12);
        });
    });

    describe('ternary operator', () => {
        it('should evaluate truthy ternary', () => {
            const ctx = { flag: true };
            const result = executor.executeExpression("this.flag ? 'yes' : 'no'", ctx, element);
            expect(result).toBe('yes');
        });

        it('should evaluate falsy ternary', () => {
            const ctx = { flag: false };
            const result = executor.executeExpression("this.flag ? 'yes' : 'no'", ctx, element);
            expect(result).toBe('no');
        });
    });

    describe('template literals', () => {
        it('should evaluate template literal', () => {
            const ctx = { name: 'World' };
            const result = executor.executeExpression('`Hello ${this.name}`', ctx, element);
            expect(result).toBe('Hello World');
        });
    });

    describe('method calls', () => {
        it('should access property on a context object', () => {
            const ctx = { items: [1, 2, 3] };
            const result = executor.executeExpression('this.items.length', ctx, element);
            expect(result).toBe(3);
        });

        it('should call a context method', () => {
            const ctx = { greet: (name: string) => `Hi ${name}` };
            const result = executor.executeExpression("this.greet('Alice')", ctx, element);
            expect(result).toBe('Hi Alice');
        });
    });

    describe('error handling', () => {
        it('should return undefined for invalid expression', () => {
            const ctx = {};
            const result = executor.executeExpression('this.is.bad.!!!', ctx, element);
            expect(result).toBeUndefined();
        });

        it('should return undefined for undefined property access', () => {
            const ctx = {};
            const result = executor.executeExpression('this.foo', ctx, element);
            expect(result).toBeUndefined();
        });

        it('should not throw for null expression', () => {
            const ctx = {};
            expect(() => executor.executeExpression(null, ctx, element)).not.toThrow();
        });
    });

    describe('caching', () => {
        it('should cache compiled functions and return consistent results', () => {
            const ctx1 = { x: 1 };
            const ctx2 = { x: 2 };

            const r1 = executor.executeExpression('this.x + 1', ctx1, element);
            const r2 = executor.executeExpression('this.x + 1', ctx2, element);

            expect(r1).toBe(2);
            expect(r2).toBe(3);
        });
    });

    describe('multi-statement expressions', () => {
        it('should handle semicolon-separated expressions (fallback to multi-statement)', () => {
            const ctx = { val: 0 };
            // Multi-statement expressions don't have a return value
            const result = executor.executeExpression('this.val = 1; this.val = 2', ctx, element);
            expect(result).toBeUndefined();
        });
    });

    describe('comparison operators', () => {
        it('should evaluate equality', () => {
            const ctx = { a: 5, b: 5 };
            const result = executor.executeExpression('this.a === this.b', ctx, element);
            expect(result).toBe(true);
        });

        it('should evaluate inequality', () => {
            const ctx = { a: 5, b: 10 };
            const result = executor.executeExpression('this.a < this.b', ctx, element);
            expect(result).toBe(true);
        });
    });

    describe('logical operators', () => {
        it('should evaluate && operator', () => {
            const ctx = { a: true, b: false };
            const result = executor.executeExpression('this.a && this.b', ctx, element);
            expect(result).toBe(false);
        });

        it('should evaluate || operator', () => {
            const ctx = { a: false, b: true };
            const result = executor.executeExpression('this.a || this.b', ctx, element);
            expect(result).toBe(true);
        });
    });

    describe('array/object expressions', () => {
        it('should evaluate array literal', () => {
            const ctx = {};
            const result = executor.executeExpression('[1, 2, 3]', ctx, element);
            expect(result).toEqual([1, 2, 3]);
        });

        it('should evaluate object literal', () => {
            const ctx = { x: 1 };
            const result = executor.executeExpression('({a: this.x})', ctx, element);
            expect(result).toEqual({ a: 1 });
        });
    });

    describe('execution params', () => {
        it('should make named params available as variables', () => {
            const ctx = {};
            const params = createParams(['item', 'index'], ['hello', 0]);
            const result = executor.executeExpression('item', ctx, element, params);
            expect(result).toBe('hello');
        });
    });

    describe('debug mode', () => {
        it('should throw on compilation error in debug mode', () => {
            const debugExecutor = new ExpressionExecutor(() => true);

            expect(() => {
                debugExecutor.executeExpression('this.is.bad.!!!', {}, element);
            }).toThrow();
        });

        it('should emit a warning for multi-statement fallback in debug mode', () => {
            const debugExecutor = new ExpressionExecutor(() => true);

            debugExecutor.executeExpression('this.a = 1; this.b = 2', { a: 0, b: 0 }, element);
            expect(console.warn).toHaveBeenCalled();
        });
    });

    describe('runtime execution error', () => {
        it('should return undefined when expression compiles but throws at runtime', () => {
            const ctx = {};
            const result = executor.executeExpression('this.foo.bar.baz', ctx, element);
            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('multi-statement side effects', () => {
        it('should actually apply side effects from multi-statement expression', () => {
            const ctx = { x: 0, y: 0 };
            executor.executeExpression('this.x = 10; this.y = 20', ctx, element);
            expect(ctx.x).toBe(10);
            expect(ctx.y).toBe(20);
        });
    });

    describe('M-22: compile failures are memoized (not re-attempted every cycle)', () => {
        it('should log a compile error only once for repeated invocations of a malformed expression', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const ctx = {};
            // Same execution context, same malformed expression → cache hit on subsequent calls.
            for (let i = 0; i < 5; i++) {
                executor.executeExpression('this..invalid', ctx, element);
            }
            // What we care about is that the *compile* path doesn't re-fail every cycle.
            // Cached sentinel returns undefined (the failing call itself is pinned by R6-7 below).
            const callsBeforeMore = (errorSpy.mock.calls as any[]).length;
            for (let i = 0; i < 10; i++) {
                executor.executeExpression('this..invalid', ctx, element);
            }
            // With the sentinel cached as `() => undefined`, no additional compile errors fire.
            // Calls grow only via runtime sentinel path (no-op `() => undefined` doesn't throw), so
            // call count should remain stable after the first failure.
            expect((errorSpy.mock.calls as any[]).length).toBe(callsBeforeMore);
            errorSpy.mockRestore();
        });
    });

    describe('R6-7: a compile error is reported once, without a bogus execution error', () => {
        // The catch used to cache the `() => undefined` stub without assigning it to the local
        // `compiledFn`, so the failing call fell through to `undefined.apply(...)` and logged a
        // second, misleading "execution error: TypeError: Cannot read properties of undefined".
        function messages(): string[] {
            return (console.error as jest.Mock).mock.calls.map(call => call.map(String).join(' '));
        }

        it('should log exactly one compilation error and no execution error on the failing call', () => {
            const result = executor.executeExpression('this..invalid', {}, element);

            expect(result).toBeUndefined();
            expect(messages()).toHaveLength(1);
            expect(messages()[0]).toContain('expression "this..invalid" compilation error');
            expect(messages().some(message => message.includes('execution error'))).toBe(false);
        });

        it('should stay silent on later calls that hit the cached stub', () => {
            executor.executeExpression('this..invalid', {}, element);
            (console.error as jest.Mock).mockClear();

            for (let i = 0; i < 3; i++) {
                expect(executor.executeExpression('this..invalid', {}, element)).toBeUndefined();
            }

            expect(console.error).not.toHaveBeenCalled();
        });

        it('should report the compile failure once per execution-params shape (separate cache keys)', () => {
            executor.executeExpression('this..invalid', {}, element);
            executor.executeExpression('this..invalid', {}, element, createParams(['item'], [1]));

            expect(messages()).toHaveLength(2);
            expect(messages().every(message => message.includes('compilation error'))).toBe(true);
        });

        it('should still report a genuine runtime error as an execution error', () => {
            executor.executeExpression('this.foo.bar', {}, element);

            expect(messages()).toHaveLength(1);
            expect(messages()[0]).toContain('expression "this.foo.bar" execution error');
            expect(messages()[0]).not.toContain('compilation error');
        });
    });

    describe('H-7: expression cache key collisions', () => {
        // Cache key includes both expression text and param names. Two semantically-different
        // (expression, paramNames) combinations must NOT collide and reuse the wrong compiled fn.
        it('should not collide expression "a" with param ["b","c"] vs expression "a" with param "b,c"', () => {
            const ctx = { a: 99 };
            // First call: param `b,c` (a single name that LOOKS like two)
            const params1 = createParams(['b,c'], [42]);
            const result1 = executor.executeExpression('this.a', ctx, element, params1);
            expect(result1).toBe(99);

            // Second call with a genuinely different shape — the cached fn must NOT be returned
            // with the wrong arity.
            const params2 = createParams(['b', 'c'], [10, 20]);
            const result2 = executor.executeExpression('this.a', ctx, element, params2);
            expect(result2).toBe(99);
        });

        // The key is `expression:scopeIdentity|transformersIdentity`. The scope identity has to tell
        // two different name lists apart, otherwise the function compiled for one list is applied
        // to the values of the other.
        it('should not reuse the function of ["ab","c"] for ["a","bc"]', () => {
            expect(executor.executeExpression('typeof c', {}, element, createParams(['ab', 'c'], [1, 2]))).toBe('number');
            expect(executor.executeExpression('typeof c', {}, element, createParams(['a', 'bc'], [1, 2]))).toBe('undefined');
        });

        it('should not reuse the function of one name order for another order of the same names', () => {
            expect(executor.executeExpression('ab', {}, element, createParams(['a', 'b', 'ab'], [1, 2, 3]))).toBe(3);
            expect(executor.executeExpression('ab', {}, element, createParams(['ab', 'a', 'b'], [10, 20, 30]))).toBe(10);
        });

        it('should not reuse the function of ["user","Name"] for ["userName"]', () => {
            expect(executor.executeExpression('typeof userName', {}, element, createParams(['user', 'Name'], [{}, 'n']))).toBe('undefined');
            expect(executor.executeExpression('typeof userName', {}, element, createParams(['userName'], ['n']))).toBe('string');
        });
    });

    describe('transformers are the parameters of the outer compiled function (2.3)', () => {
        it('should make a registered transformer callable from an expression', () => {
            addTransformer('upper', (value: string) => value.toUpperCase());

            expect(executor.executeExpression('upper(this.name)', { name: 'abc' }, element)).toBe('ABC');
        });

        it('should make transformers and scope params available together, with this as the context', () => {
            addTransformer('twice', (value: number) => value * 2);
            addTransformer('plus', (a: number, b: number) => a + b);

            const params = createParams(['item', 'index'], [10, 3]);

            expect(executor.executeExpression('plus(twice(item), index) + this.base', { base: 100 }, element, params)).toBe(123);
        });

        it('should keep this as the context in a multi-statement expression', () => {
            addTransformer('twice', (value: number) => value * 2);
            const ctx = { a: 0, b: 0 };

            executor.executeExpression('this.a = twice(item); this.b = this.a + 1', ctx, element, createParams(['item'], [4]));

            expect(ctx).toEqual({ a: 8, b: 9 });
        });

        it('should see a transformer that is registered after the expression was first evaluated', () => {
            expect(executor.executeExpression('typeof late', {}, element)).toBe('undefined');

            addTransformer('late', () => 'here');

            expect(executor.executeExpression('typeof late', {}, element)).toBe('function');
            expect(executor.executeExpression('late()', {}, element)).toBe('here');
        });

        it('should compile once per (expression, scope names, transformer set) and not per evaluation', () => {
            addTransformer('twice', (value: number) => value * 2);
            const compileSpy = jest.spyOn(executor as any, 'compileFunction');

            for (let i = 0; i < 5; i++) {
                expect(executor.executeExpression('twice(item)', {}, element, createParams(['item'], [i]))).toBe(i * 2);
            }
            expect(compileSpy).toHaveBeenCalledTimes(1);

            addTransformer('other', () => 0);
            executor.executeExpression('twice(item)', {}, element, createParams(['item'], [1]));
            executor.executeExpression('twice(item)', {}, element, createParams(['item'], [2]));

            expect(compileSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('compiled functions are dropped when a transformer is added (Transformers.onAdded)', () => {
        function subscriptionCount(): number {
            const callBacks = (transformers as any)._onAddedCallBackEvent._callBacks;
            return Array.isArray(callBacks) ? callBacks.length : callBacks.size;
        }

        // the cache is Map<expression, Map<scope identity, fn>> - count the compiled functions
        function cacheSize(target: ExpressionExecutor): number {
            let size = 0;
            for (const byIdentity of (target as any)._compiledFnCache.values()) {
                size += byIdentity.size;
            }
            return size;
        }

        it('should subscribe on construction and clear the whole cache on every added transformer', () => {
            expect(subscriptionCount()).toBe(1);

            executor.executeExpression('this.a', { a: 1 }, element);
            executor.executeExpression('item', {}, element, createParams(['item'], [1]));
            expect(cacheSize(executor)).toBe(2);

            addTransformer('late', () => 0);
            expect(cacheSize(executor)).toBe(0);

            executor.executeExpression('this.a', { a: 1 }, element);
            expect(cacheSize(executor)).toBe(1);
        });

        it('should not clear the cache when a registration is rejected', () => {
            addTransformer('upper', (value: string) => value.toUpperCase());
            executor.executeExpression('upper("a")', {}, element);

            addTransformer('upper', () => 'other');        // duplicate - rejected with an error

            expect(cacheSize(executor)).toBe(1);
            expect(executor.executeExpression('upper("a")', {}, element)).toBe('A');
        });

        it('should report a broken expression once more after a transformer was added (the stub is dropped too)', () => {
            executor.executeExpression('this..invalid', {}, element);
            executor.executeExpression('this..invalid', {}, element);
            expect(console.error).toHaveBeenCalledTimes(1);

            addTransformer('late', () => 0);
            executor.executeExpression('this..invalid', {}, element);
            executor.executeExpression('this..invalid', {}, element);

            expect(console.error).toHaveBeenCalledTimes(2);
        });

        it('dispose should release the subscription and be repeatable', () => {
            const other = new ExpressionExecutor(() => false);
            expect(subscriptionCount()).toBe(2);

            other.dispose();
            expect(subscriptionCount()).toBe(1);

            other.dispose();
            expect(subscriptionCount()).toBe(1);

            // the remaining executor still reacts
            executor.executeExpression('this.a', { a: 1 }, element);
            addTransformer('late', () => 0);
            expect(cacheSize(executor)).toBe(0);
        });

        it('a disposed executor keeps its cache when a transformer is added afterwards', () => {
            executor.executeExpression('this.a', { a: 1 }, element);
            executor.dispose();

            addTransformer('late', () => 0);

            expect(cacheSize(executor)).toBe(1);
        });
    });

    describe('R7-6: a scope param with the name of a transformer shadows it instead of breaking compilation', () => {
        // Transformer names and scope names used to share ONE parameter list, so the same name in
        // both was a duplicate formal parameter - a SyntaxError in strict mode for every expression
        // in that scope. nb-var / nb-repeat:prefix only validate against the transformers known at
        // construction, so a transformer registered later could do that to a live tree. The scope
        // names are now the parameters of an inner function and simply shadow the outer ones.
        it('should resolve the name to the scope param when the transformer was registered first', () => {
            addTransformer('foo', () => 'transformer');

            const result = executor.executeExpression('foo', {}, element, createParams(['foo'], ['local']));

            expect(result).toBe('local');
            expect(console.error).not.toHaveBeenCalled();
        });

        it('should keep evaluating a live scope when a transformer with the same name is registered later', () => {
            const params = () => createParams(['foo', 'other'], ['local', 5]);

            expect(executor.executeExpression('foo + other', {}, element, params())).toBe('local5');

            addTransformer('foo', () => 'transformer');

            expect(executor.executeExpression('foo + other', {}, element, params())).toBe('local5');
            expect(console.error).not.toHaveBeenCalled();
        });

        it('should still expose the late transformer to scopes that do not shadow it', () => {
            executor.executeExpression('typeof foo', {}, element, createParams(['foo'], ['local']));

            addTransformer('foo', () => 'transformer');

            expect(executor.executeExpression('foo()', {}, element, createParams(['other'], [1]))).toBe('transformer');
            expect(executor.executeExpression('foo()', {}, element)).toBe('transformer');
        });
    });
});
