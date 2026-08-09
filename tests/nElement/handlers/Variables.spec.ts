import { Variables } from '../../../src/nElement/handlers/Variables';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Constants } from '../../../src/Constants';
import { Environment } from '../../../src/Environment';
import { ExecutionParams } from '../../../src/expression/ExpressionExecParamsHelper';

describe('Variables handler', () => {
    function createElementWithVars(vars: Record<string, string>): Element {
        const el = document.createElement('div');
        for (const [name, expression] of Object.entries(vars)) {
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.VARIABLE_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}${name}`,
                expression
            );
        }
        return el;
    }

    it('should detect variable bindings', () => {
        const el = createElementWithVars({ 'my-var': 'ctx.value' });
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        expect(handler.hasNExpression).toBe(true);
        expect(handler.nExpression).toBeDefined();
        expect(handler.nExpression!.size).toBe(1);
    });

    it('should have no expression when no variable attributes', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        expect(handler.hasNExpression).toBe(false);
    });

    it('should convert kebab-case variable names to camelCase', () => {
        const el = createElementWithVars({ 'my-var-name': 'ctx.value' });
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        expect(handler.nExpression!.has('myVarName')).toBe(true);
    });

    it('should extend execution params with variable values on bind', () => {
        const el = createElementWithVars({ 'total': 'ctx.count' });
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        const result = handler.bind(undefined, () => 42);
        // When variables exist, bind returns extended execution params
        expect(result).toBeDefined();
    });

    it('should pass through executionParams when no expression', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        const params = { existing: true } as any;
        expect(handler.bind(params, () => {})).toBe(params);
    });

    it('should extend executionParams with the undefined var when single-binded expression returns undefined', () => {
        // `#expr` is single-binded; when the executor returns undefined the data binder is
        // never called, so the var keeps its initial undefined value. bind still rebuilds the
        // params (left-to-right sibling resolution), extending them with the var set to undefined.
        const el = createElementWithVars({ 'lazy': '#ctx.maybe' });
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        const params = new ExecutionParams(['existing'], [true]);
        const result = handler.bind(params, () => undefined)!;

        expect(result).not.toBe(params);
        expect(result.names).toContain('existing');
        expect(result.names).toContain('lazy');
        expect(result.values[result.names.indexOf('lazy')]).toBeUndefined();
    });

    it('isDirty should always be false', () => {
        const el = createElementWithVars({ 'x': 'ctx.x' });
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        handler.bind(undefined, () => 'val');
        expect(handler.isDirty).toBe(false);
    });

    it('commit should always return false', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Variables(el, attrs);

        expect(handler.commit()).toBe(false);
    });

    describe('constructor error paths', () => {
        it('should error when variable name is empty', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            el.setAttribute(
                `${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.VARIABLE_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}`,
                'ctx.x'
            );
            const attrs = new Attributes(el);
            const handler = new Variables(el, attrs);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should error when variable value is undefined', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = document.createElement('div');
            const varKey = `${Constants.VARIABLE_HANDLER_PREFIX_NAME}${Constants.META_VALUE_SEPARATOR}my-var`;
            const mockAttrs = {
                has: (_name: string, _sys?: boolean, _prefix?: boolean) => true,
                getAll: () => new Map<string, string | undefined>([[varKey, undefined]]),
                get: () => undefined
            } as unknown as Attributes;
            const handler = new Variables(el, mockAttrs);

            expect(consoleSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, el, expect.stringContaining("value handler can't be empty"));
            consoleSpy.mockRestore();
        });

        it('should error and skip when variable name is a reserved context name', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            // 'item' is one of the reserved repeat names (RESERVED_CONTEXT_NAMES).
            const el = createElementWithVars({ 'item': 'ctx.value' });
            const attrs = new Attributes(el);
            const handler = new Variables(el, attrs);

            expect(consoleSpy).toHaveBeenCalledWith(
                `${Constants.DISPLAY_NAME}: `,
                el,
                expect.stringContaining("name cannot be created, this name is reserved")
            );
            // The reserved variable should NOT have been added to the expression map.
            expect(handler.nExpression!.has('item')).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should error and skip when variable name conflicts with a registered transformer', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            // Register a transformer via the public API so both _names and _namesSet stay in sync.
            class MyTransformerContext { transform() { return 'transformed'; } }
            Environment.addTransformer('mytransformer', MyTransformerContext as any, []);

            try {
                const el = createElementWithVars({ 'mytransformer': 'ctx.value' });
                const attrs = new Attributes(el);
                const handler = new Variables(el, attrs);

                expect(consoleSpy).toHaveBeenCalledWith(
                    `${Constants.DISPLAY_NAME}: `,
                    el,
                    expect.stringContaining("conflicting with case-insensitive transformer name")
                );
                expect(handler.nExpression!.has('mytransformer')).toBe(false);
            } finally {
                // Cleanup: pop both the names array and the internal Set so other tests are unaffected.
                // `instances` returns ReadonlyArrays; reach for the live arrays via the private fields.
                const transformerNames = (Environment.transformers as any)._names as Array<string>;
                const transformerFns = (Environment.transformers as any)._functions as Array<(...args: any[]) => any>;
                transformerNames.pop();
                transformerFns.pop();
                (Environment.transformers as any)._namesSet.delete('mytransformer');
                consoleSpy.mockRestore();
            }
        });

        it('should detect transformer conflict against the camelCased variable name (kebab-case)', () => {
            // M-5: the conflict check used to compare the raw kebab attribute name
            // (e.g. 'my-fn') against transformer names (camelCase like 'myFn'),
            // so a clashing kebab variable could slip through. The fix compares contextValueName.
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            class MyFnTransformerContext { transform() { return 'transformed'; } }
            Environment.addTransformer('myFn', MyFnTransformerContext as any, []);

            try {
                const el = createElementWithVars({ 'my-fn': 'ctx.value' });
                const attrs = new Attributes(el);
                const handler = new Variables(el, attrs);

                expect(consoleSpy).toHaveBeenCalledWith(
                    `${Constants.DISPLAY_NAME}: `,
                    el,
                    expect.stringContaining("conflicting with case-insensitive transformer name")
                );
                // The conflicting variable must NOT be registered under either the kebab or the camel name
                expect(handler.nExpression!.has('myFn')).toBe(false);
                expect(handler.nExpression!.has('my-fn')).toBe(false);
            } finally {
                const transformerNames = (Environment.transformers as any)._names as Array<string>;
                const transformerFns = (Environment.transformers as any)._functions as Array<(...args: any[]) => any>;
                transformerNames.pop();
                transformerFns.pop();
                (Environment.transformers as any)._namesSet.delete('myfn');
                consoleSpy.mockRestore();
            }
        });

        describe('#8: variable names must be valid identifiers', () => {
            // Var names become formal parameters of every compiled expression in scope
            // (ExpressionExecParamsHelper.createOrExtendVarExecParams), and the expression body is
            // compiled in strict mode (ExpressionExecutor: '"use strict"'). A name that is not a
            // valid strict-mode identifier therefore breaks compilation of EVERY expression in scope,
            // not just its own binding — so it has to be rejected at construction.
            const invalidNames = [
                'if', 'class', 'return', 'new', 'typeof', 'this', 'null', 'true',  // reserved words
                'let', 'static', 'public', 'private', 'protected',                 // strict-mode-only reserved
                'implements', 'interface', 'package', 'yield',
                'eval', 'arguments',                                               // illegal strict-mode param names
                '0abc'                                                             // not an identifier at all
            ];

            it.each(invalidNames)('should error and skip the variable named %s', (name) => {
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                const el = createElementWithVars({ [name]: 'ctx.value' });
                const attrs = new Attributes(el);
                const handler = new Variables(el, attrs);

                expect(consoleSpy).toHaveBeenCalledWith(
                    `${Constants.DISPLAY_NAME}: `,
                    el,
                    expect.stringContaining('is not a valid identifier')
                );
                expect(handler.nExpression!.has(name)).toBe(false);
                consoleSpy.mockRestore();
            });

            it('should keep a valid variable that shares an element with a rejected one', () => {
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                const el = createElementWithVars({ 'let': 'ctx.bad', 'total': 'ctx.count' });
                const attrs = new Attributes(el);
                const handler = new Variables(el, attrs);

                expect(handler.nExpression!.has('let')).toBe(false);
                expect(handler.nExpression!.has('total')).toBe(true);
                consoleSpy.mockRestore();
            });

            // Attribute names are lowercased by the DOM, so the camelCase spellings only ever
            // arrive here via kebab-case ('my-var' -> 'myVar'); '$' is not allowed in an
            // attribute name at all (InvalidCharacterError), so it cannot be a var name.
            it.each(['value', 'myvar', '_private', 'await', 'async', 'undefined'])(
                'should accept the valid identifier %s', (name) => {
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                const el = createElementWithVars({ [name]: 'ctx.value' });
                const attrs = new Attributes(el);
                const handler = new Variables(el, attrs);

                expect(handler.nExpression!.has(name)).toBe(true);
                consoleSpy.mockRestore();
            });

            it('should validate the camelCased name, not the lowercased one', () => {
                // Validation runs on contextValueName ('cLass'), which is a perfectly valid
                // identifier — lowercasing it first would falsely reject it as the reserved word 'class'.
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                const el = createElementWithVars({ 'c-lass': 'ctx.value' });
                const attrs = new Attributes(el);
                const handler = new Variables(el, attrs);

                expect(handler.nExpression!.has('cLass')).toBe(true);
                consoleSpy.mockRestore();
            });
        });
    });
});
