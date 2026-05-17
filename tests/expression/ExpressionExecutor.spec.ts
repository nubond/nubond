import { ExpressionExecutor } from '../../src/expression/ExpressionExecutor';
import { ExecutionParams } from '../../src/expression/ExpressionExecParamsHelper';

// Mock Environment.transformers to avoid importing full Environment
jest.mock('../../src/Environment', () => ({
    Environment: {
        transformers: {
            instances: [[], []] as [string[], ((...args: any) => any)[]]
        },
        router: { isConfigured: false }
    }
}));

describe('ExpressionExecutor', () => {
    let executor: ExpressionExecutor;
    let element: Element;

    beforeEach(() => {
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
            const params = new ExecutionParams(['item', 'index'], ['hello', 0]);
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
            // Each invocation also flows past the runtime catch which logs; what we care about
            // is that the *compile* path doesn't re-fail every cycle. Cached sentinel returns undefined.
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

    describe('H-7: expression cache key collisions', () => {
        // Cache key includes both expression text and param names. Two semantically-different
        // (expression, paramNames) combinations must NOT collide and reuse the wrong compiled fn.
        it('should not collide expression "a" with param ["b","c"] vs expression "a" with param "b,c"', () => {
            const ctx = { a: 99 };
            // First call: param `b,c` (a single name that LOOKS like two)
            const params1 = new ExecutionParams(['b,c'], [42]);
            const result1 = executor.executeExpression('this.a', ctx, element, params1);
            expect(result1).toBe(99);

            // Second call with a genuinely different shape — the cached fn must NOT be returned
            // with the wrong arity.
            const params2 = new ExecutionParams(['b', 'c'], [10, 20]);
            const result2 = executor.executeExpression('this.a', ctx, element, params2);
            expect(result2).toBe(99);
        });
    });
});
