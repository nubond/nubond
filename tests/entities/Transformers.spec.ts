import { Transformers } from '../../src/entities/Transformers';
import { Injectables } from '../../src/entities/Injectables';
import { ITransformerContext } from '../../src/interfaces/contexts/ITransformerContext';
import { Constants } from '../../src/Constants';

describe('Transformers', () => {
    let injectables: Injectables;
    let transformers: Transformers;

    beforeEach(() => {
        injectables = new Injectables();
        transformers = new Transformers(injectables);
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should add a transformer and expose it via names / functions', () => {
        class MyTransformer implements ITransformerContext {
            transform(value: string) { return value.toUpperCase(); }
        }

        transformers.add('upper', MyTransformer as any, []);

        const names = transformers.names;
        const fns = transformers.functions;
        expect(names).toContain('upper');
        expect(fns.length).toBe(1);
    });

    it('should invoke transformer function correctly', () => {
        class MyTransformer implements ITransformerContext {
            transform(value: number) { return value * 2; }
        }

        transformers.add('double', MyTransformer as any, []);

        const fns = transformers.functions;
        const result = fns[0](5);
        expect(result).toBe(10);
    });

    it('should reject reserved name "item"', () => {
        class MyTransformer implements ITransformerContext {
            transform() { return null; }
        }

        transformers.add('item', MyTransformer as any, []);
        expect(console.error).toHaveBeenCalled();
    });

    it('should reject reserved name "index"', () => {
        class MyTransformer implements ITransformerContext {
            transform() { return null; }
        }

        transformers.add('index', MyTransformer as any, []);
        expect(console.error).toHaveBeenCalled();
    });

    it('should reject reserved name "event"', () => {
        class MyTransformer implements ITransformerContext {
            transform() { return null; }
        }

        transformers.add('event', MyTransformer as any, []);
        expect(console.error).toHaveBeenCalled();
    });

    it('should reject reserved name "nativeElement"', () => {
        class MyTransformer implements ITransformerContext {
            transform() { return null; }
        }

        transformers.add('nativeElement', MyTransformer as any, []);
        expect(console.error).toHaveBeenCalled();
    });

    it('should reject reserved name "router"', () => {
        class MyTransformer implements ITransformerContext {
            transform() { return null; }
        }

        transformers.add('router', MyTransformer as any, []);
        expect(console.error).toHaveBeenCalled();
    });

    it('should register transformer with dependencies', () => {
        class DepService {
            getValue() { return 100; }
        }

        class MyTransformer implements ITransformerContext {
            constructor(public dep: DepService) {}
            transform(value: number) { return value + this.dep.getValue(); }
        }

        injectables.register(DepService as any, []);
        transformers.add('addHundred', MyTransformer as any, [DepService as any]);

        const fns = transformers.functions;
        const result = fns[0](5);
        expect(result).toBe(105);
    });

    it('should add multiple transformers', () => {
        class T1 implements ITransformerContext {
            transform(v: number) { return v + 1; }
        }
        class T2 implements ITransformerContext {
            transform(v: number) { return v * 2; }
        }

        transformers.add('inc', T1 as any, []);
        transformers.add('dbl', T2 as any, []);

        const names = transformers.names;
        expect(names).toContain('inc');
        expect(names).toContain('dbl');
    });

    it('should reject duplicate transformer name', () => {
        class T1 implements ITransformerContext {
            transform(v: number) { return v + 1; }
        }
        class T2 implements ITransformerContext {
            transform(v: number) { return v * 2; }
        }

        transformers.add('myTransformer', T1 as any, []);
        transformers.add('myTransformer', T2 as any, []);

        const names = transformers.names;
        expect(names.filter(n => n === 'myTransformer').length).toBe(1);
    });

    it('should reject reserved name "element"', () => {
        class T implements ITransformerContext { transform() { return null; } }
        transformers.add('element', T as any, []);
        expect(console.error).toHaveBeenCalled();
        expect(transformers.names).not.toContain('element');
    });

    it('should reject reserved name "data"', () => {
        class T implements ITransformerContext { transform() { return null; } }
        transformers.add('data', T as any, []);
        expect(console.error).toHaveBeenCalled();
        expect(transformers.names).not.toContain('data');
    });

    it('should reject reserved name "count"', () => {
        class T implements ITransformerContext { transform() { return null; } }
        transformers.add('count', T as any, []);
        expect(console.error).toHaveBeenCalled();
        expect(transformers.names).not.toContain('count');
    });

    it('should not add to names / functions when reserved name is used', () => {
        class T implements ITransformerContext { transform() { return null; } }
        transformers.add('item', T as any, []);
        const names = transformers.names;
        const fns = transformers.functions;
        expect(names.length).toBe(0);
        expect(fns.length).toBe(0);
    });

    describe('onAdded', () => {
        // ExpressionExecutor subscribes here to drop its compiled functions: a compiled expression
        // is bound to the transformer set it was compiled against.
        class T implements ITransformerContext { transform() { return null; } }

        it('should notify with the name after a transformer was added', () => {
            const callBack = jest.fn();
            transformers.onAdded(callBack);

            transformers.add('upper', T as any, []);

            expect(callBack).toHaveBeenCalledTimes(1);
            expect(callBack).toHaveBeenCalledWith('upper');
        });

        it('should notify when the transformer is already visible in names and functions', () => {
            let seen: Array<any> = [];
            transformers.onAdded(name => seen = [transformers.names.indexOf(name), transformers.functions.length, transformers.has(name)]);

            transformers.add('upper', T as any, []);

            expect(seen).toEqual([0, 1, true]);
        });

        it.each([
            ['a duplicate name', 'upper'],
            ['a duplicate name in another case', 'UPPER'],
            ['a reserved name', 'item'],
            ['an invalid identifier', 'my-transformer'],
        ])('should not notify when the registration is rejected (%s)', (_reason, name) => {
            transformers.add('upper', T as any, []);

            const callBack = jest.fn();
            transformers.onAdded(callBack);
            transformers.add(name, T as any, []);

            expect(callBack).not.toHaveBeenCalled();
        });

        it('should stop notifying after the returned unsubscribe function was called', () => {
            const kept = jest.fn();
            const dropped = jest.fn();
            transformers.onAdded(kept);
            const unSubscribe = transformers.onAdded(dropped);

            unSubscribe();
            transformers.add('upper', T as any, []);

            expect(kept).toHaveBeenCalledTimes(1);
            expect(dropped).not.toHaveBeenCalled();
        });
    });

    describe('#8: transformer names must be valid identifiers', () => {
        // Every registered transformer name is a formal parameter of the outer function of EVERY
        // compiled expression in the application (ExpressionExecutor.compileFunction), and the
        // body is compiled in strict mode. One bad name therefore fails compilation of every
        // expression app-wide, so registration has to be refused.
        const invalidNames = [
            'my-transformer',                                                  // the originally reported case
            'if', 'class', 'return', 'new', 'typeof', 'this', 'null', 'true',  // reserved words
            'let', 'static', 'public', 'private', 'protected',                 // strict-mode-only reserved
            'implements', 'interface', 'package', 'yield',
            'eval', 'arguments',                                               // illegal strict-mode param names
            '0abc', 'a b', 'a.b', 'a=1', '{a}', '...a'                         // not identifiers at all
        ];

        it.each(invalidNames)('should reject %s', (name) => {
            class T implements ITransformerContext { transform() { return null; } }

            transformers.add(name, T as any, []);

            expect(console.error).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                expect.stringContaining(`'${name}' is not a valid identifier`)
            );
            const names = transformers.names;
            const fns = transformers.functions;
            expect(names.length).toBe(0);
            expect(fns.length).toBe(0);
        });

        it.each(['upper', 'myTransformer', '_private', '$dollar', 'await', 'async', 'undefined'])(
            'should accept the valid identifier %s', (name) => {
            class T implements ITransformerContext { transform() { return null; } }

            transformers.add(name, T as any, []);

            expect(transformers.names).toContain(name);
        });

        it('should not disturb an already-registered transformer when a later one is rejected', () => {
            class Good implements ITransformerContext { transform(v: number) { return v + 1; } }
            class Bad implements ITransformerContext { transform() { return null; } }

            transformers.add('good', Good as any, []);
            transformers.add('let', Bad as any, []);

            const names = transformers.names;
            const fns = transformers.functions;
            expect(names).toEqual(['good']);
            expect(fns.length).toBe(1);
        });
    });
});
