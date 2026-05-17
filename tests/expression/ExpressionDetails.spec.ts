import { ExpressionDetails } from '../../src/expression/ExpressionDetails';

describe('ExpressionDetails', () => {
    describe('plain expression (two-way binding)', () => {
        it('should parse a simple property expression', () => {
            const details = new ExpressionDetails('foo.bar');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(false);
        });

        it('should trim whitespace', () => {
            const details = new ExpressionDetails('  foo.bar  ');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(false);
        });
    });

    describe('single-bind prefix (#)', () => {
        it('should strip # prefix and mark as single-binded', () => {
            const details = new ExpressionDetails('#foo.bar');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should handle # with spaces', () => {
            const details = new ExpressionDetails('  # foo.bar  ');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(true);
        });
    });

    describe('constant-bind prefix (@)', () => {
        it('should wrap string constant in double quotes', () => {
            const details = new ExpressionDetails('@hello');
            expect(details.expression).toBe('"hello"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve numeric constant as-is', () => {
            const details = new ExpressionDetails('@42');
            expect(details.expression).toBe('42');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve negative numeric constant', () => {
            const details = new ExpressionDetails('@-3.14');
            expect(details.expression).toBe('-3.14');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve boolean "true" as-is', () => {
            const details = new ExpressionDetails('@true');
            expect(details.expression).toBe('true');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve boolean "false" as-is', () => {
            const details = new ExpressionDetails('@false');
            expect(details.expression).toBe('false');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should NOT recognize uppercase "TRUE" as a boolean (case-sensitive) and wrap as string', () => {
            // Only lowercase 'true'/'false' are treated as bare boolean literals; everything else
            // non-numeric is wrapped in double quotes.
            const details = new ExpressionDetails('@TRUE');
            expect(details.expression).toBe('"TRUE"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should NOT recognize uppercase "FALSE" as a boolean and wrap as string', () => {
            const details = new ExpressionDetails('@FALSE');
            expect(details.expression).toBe('"FALSE"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should wrap non-numeric non-boolean value in double quotes', () => {
            const details = new ExpressionDetails('@some-text');
            expect(details.expression).toBe('"some-text"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve embedded backticks in constant strings', () => {
            const details = new ExpressionDetails('@hello`world');
            expect(details.expression).toBe('"hello`world"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should handle @ with spaces', () => {
            const details = new ExpressionDetails('  @ hello  ');
            expect(details.expression).toBe('"hello"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should produce an empty string literal when nothing follows @', () => {
            const details = new ExpressionDetails('@');
            expect(details.expression).toBe('""');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should produce an empty string literal when only whitespace follows @', () => {
            const details = new ExpressionDetails('@   ');
            expect(details.expression).toBe('""');
            expect(details.isSingleBinded).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty expression after prefix', () => {
            const details = new ExpressionDetails('#');
            expect(details.expression).toBe('');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should handle expression with arithmetic', () => {
            const details = new ExpressionDetails('x + y * 2');
            expect(details.expression).toBe('x + y * 2');
            expect(details.isSingleBinded).toBe(false);
        });
    });

    describe('H-6: @-literal double-quote escaping', () => {
        // Before the fix, replaceAll('"', '\"') (with the parser-consumed backslash) was a no-op,
        // so `@hello "world"` would emit invalid JS  `return ("hello "world"")` — a compile error.
        it('should escape embedded double quotes in a string literal', () => {
            const details = new ExpressionDetails('@hello "world"');
            expect(details.expression).toBe('"hello \\"world\\""');
            // Must compile cleanly as a JS string literal
            expect(() => new Function(`return (${details.expression});`)).not.toThrow();
            expect(new Function(`return (${details.expression});`)()).toBe('hello "world"');
        });

        it('should escape a single embedded double quote', () => {
            const details = new ExpressionDetails('@say "hi');
            expect(new Function(`return (${details.expression});`)()).toBe('say "hi');
        });

        it('should not affect strings without double quotes', () => {
            const details = new ExpressionDetails('@plain text');
            expect(details.expression).toBe('"plain text"');
        });
    });

    describe('M-8: strict numeric detection for @-literal', () => {
        // isNaN(+'  ')  is false in plain JS (coerces to 0).
        // isNaN(+'1e10') is false but 1e10 is far from the user-typed intent.
        // The fix is intended to require strict numeric-looking input; verify current behavior.
        it('should preserve a plain integer', () => {
            expect(new ExpressionDetails('@123').expression).toBe('123');
        });

        it('should preserve a decimal', () => {
            expect(new ExpressionDetails('@1.5').expression).toBe('1.5');
        });

        it('should preserve a negative number', () => {
            expect(new ExpressionDetails('@-7').expression).toBe('-7');
        });
    });
});
