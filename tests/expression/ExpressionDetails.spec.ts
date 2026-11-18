import { ExpressionDetails } from '../../src/expression/ExpressionDetails';

describe('ExpressionDetails', () => {
    describe('plain expression (two-way binding)', () => {
        it('should parse a simple property expression', () => {
            const details = ExpressionDetails.create('foo.bar');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(false);
        });

        it('should trim whitespace', () => {
            const details = ExpressionDetails.create('  foo.bar  ');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(false);
        });
    });

    describe('single-bind prefix (#)', () => {
        it('should strip # prefix and mark as single-binded', () => {
            const details = ExpressionDetails.create('#foo.bar');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should handle # with spaces', () => {
            const details = ExpressionDetails.create('  # foo.bar  ');
            expect(details.expression).toBe('foo.bar');
            expect(details.isSingleBinded).toBe(true);
        });
    });

    describe('constant-bind prefix (@)', () => {
        it('should wrap string constant in double quotes', () => {
            const details = ExpressionDetails.create('@hello');
            expect(details.expression).toBe('"hello"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve numeric constant as-is', () => {
            const details = ExpressionDetails.create('@42');
            expect(details.expression).toBe('42');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve negative numeric constant', () => {
            const details = ExpressionDetails.create('@-3.14');
            expect(details.expression).toBe('-3.14');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve boolean "true" as-is', () => {
            const details = ExpressionDetails.create('@true');
            expect(details.expression).toBe('true');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve boolean "false" as-is', () => {
            const details = ExpressionDetails.create('@false');
            expect(details.expression).toBe('false');
            expect(details.isSingleBinded).toBe(true);
        });

        // L-47: '@null' / '@undefined' used to be quoted into the strings "null" / "undefined"
        it('should preserve "null" as the null literal (L-47)', () => {
            const details = ExpressionDetails.create('@null');
            expect(details.expression).toBe('null');
            expect(details.isSingleBinded).toBe(true);
            expect(new Function(`return ${details.expression};`)()).toBeNull();
        });

        it('should preserve "undefined" as the undefined literal (L-47)', () => {
            const details = ExpressionDetails.create('@ undefined ');
            expect(details.expression).toBe('undefined');
            expect(details.isSingleBinded).toBe(true);
            expect(new Function(`return ${details.expression};`)()).toBeUndefined();
        });

        it('should still quote other casings of null/undefined (case-sensitive like true/false)', () => {
            expect(ExpressionDetails.create('@NULL').expression).toBe('"NULL"');
            expect(ExpressionDetails.create('@Undefined').expression).toBe('"Undefined"');
            expect(ExpressionDetails.create('@"null"').expression).toBe('"\\"null\\""');
        });

        it('should NOT recognize uppercase "TRUE" as a boolean (case-sensitive) and wrap as string', () => {
            // Only lowercase 'true'/'false' are treated as bare boolean literals; everything else
            // non-numeric is wrapped in double quotes.
            const details = ExpressionDetails.create('@TRUE');
            expect(details.expression).toBe('"TRUE"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should NOT recognize uppercase "FALSE" as a boolean and wrap as string', () => {
            const details = ExpressionDetails.create('@FALSE');
            expect(details.expression).toBe('"FALSE"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should wrap non-numeric non-boolean value in double quotes', () => {
            const details = ExpressionDetails.create('@some-text');
            expect(details.expression).toBe('"some-text"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should preserve embedded backticks in constant strings', () => {
            const details = ExpressionDetails.create('@hello`world');
            expect(details.expression).toBe('"hello`world"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should handle @ with spaces', () => {
            const details = ExpressionDetails.create('  @ hello  ');
            expect(details.expression).toBe('"hello"');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should produce an empty string literal when nothing follows @', () => {
            const details = ExpressionDetails.create('@');
            expect(details.expression).toBe('""');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should produce an empty string literal when only whitespace follows @', () => {
            const details = ExpressionDetails.create('@   ');
            expect(details.expression).toBe('""');
            expect(details.isSingleBinded).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty expression after prefix', () => {
            const details = ExpressionDetails.create('#');
            expect(details.expression).toBe('');
            expect(details.isSingleBinded).toBe(true);
        });

        it('should handle expression with arithmetic', () => {
            const details = ExpressionDetails.create('x + y * 2');
            expect(details.expression).toBe('x + y * 2');
            expect(details.isSingleBinded).toBe(false);
        });
    });

    describe('H-6: @-literal double-quote escaping', () => {
        // Before the fix, replaceAll('"', '\"') (with the parser-consumed backslash) was a no-op,
        // so `@hello "world"` would emit invalid JS  `return ("hello "world"")` — a compile error.
        it('should escape embedded double quotes in a string literal', () => {
            const details = ExpressionDetails.create('@hello "world"');
            expect(details.expression).toBe('"hello \\"world\\""');
            // Must compile cleanly as a JS string literal
            expect(() => new Function(`return (${details.expression});`)).not.toThrow();
            expect(new Function(`return (${details.expression});`)()).toBe('hello "world"');
        });

        it('should escape a single embedded double quote', () => {
            const details = ExpressionDetails.create('@say "hi');
            expect(new Function(`return (${details.expression});`)()).toBe('say "hi');
        });

        it('should not affect strings without double quotes', () => {
            const details = ExpressionDetails.create('@plain text');
            expect(details.expression).toBe('"plain text"');
        });
    });

    describe('M-5: @-literal backslash and control-character escaping', () => {
        // These assert the ROUND-TRIPPED VALUE, not the generated source. Asserting the source text
        // alone is not enough: an escape chain that escapes control chars before backslashes emits
        // perfectly valid JS that silently evaluates to the wrong string (a real newline came back as
        // the two characters '\' + 'n'). Compile the way ExpressionExecutor does and check the value.
        function valueOf(raw: string): any {
            return new Function(`return (${ExpressionDetails.create(raw).expression});`)();
        }

        it('should round-trip a windows path with backslashes', () => {
            expect(valueOf('@C:\\temp\\new')).toBe('C:\\temp\\new');
        });

        it('should round-trip a trailing backslash', () => {
            expect(valueOf('@C:\\temp\\')).toBe('C:\\temp\\');
        });

        it('should round-trip a backslash immediately before a double quote', () => {
            expect(valueOf('@back\\"slash')).toBe('back\\"slash');
        });

        it('should round-trip an embedded newline as a real newline', () => {
            const value = valueOf('@line1\nline2');

            expect(value).toBe('line1\nline2');
            expect(value).not.toContain('\\');
        });

        it('should round-trip an embedded carriage return as a real CR', () => {
            expect(valueOf('@line1\rline2')).toBe('line1\rline2');
        });

        it('should round-trip an embedded tab as a real tab', () => {
            expect(valueOf('@a\tb')).toBe('a\tb');
        });

        it('should round-trip a backslash sitting next to a real newline', () => {
            // the case that pins the escape ORDER: backslashes must be escaped before the
            // control characters, otherwise the backslash step re-escapes what they emitted
            expect(valueOf('@a\\\nb')).toBe('a\\\nb');
        });

        it('should compile cleanly for every escaped form', () => {
            for (const raw of ['@C:\\temp\\', '@a\tb', '@line1\nline2', '@say "hi"', '@a\\\nb']) {
                expect(() => new Function(`return (${ExpressionDetails.create(raw).expression});`)).not.toThrow();
            }
        });
    });

    describe('M-8: strict numeric detection for @-literal', () => {
        // isNaN(+'  ')  is false in plain JS (coerces to 0).
        // isNaN(+'1e10') is false but 1e10 is far from the user-typed intent.
        // The fix is intended to require strict numeric-looking input; verify current behavior.
        it('should preserve a plain integer', () => {
            expect(ExpressionDetails.create('@123').expression).toBe('123');
        });

        it('should preserve a decimal', () => {
            expect(ExpressionDetails.create('@1.5').expression).toBe('1.5');
        });

        it('should preserve a negative number', () => {
            expect(ExpressionDetails.create('@-7').expression).toBe('-7');
        });
    });

    // ExpressionDetails is immutable, so one instance per distinct raw expression is shared by every
    // handler (every repeat row) that uses it.
    describe('create (shared instances)', () => {
        it('should return the same instance for the same raw expression', () => {
            const first = ExpressionDetails.create('row.label');
            expect(ExpressionDetails.create('row.label')).toBe(first);
        });

        it('should return different instances for different raw expressions', () => {
            expect(ExpressionDetails.create('row.a')).not.toBe(ExpressionDetails.create('row.b'));
        });

        it('should key on the raw text — whitespace variants are separate instances with equal content', () => {
            const plain = ExpressionDetails.create('row.c');
            const padded = ExpressionDetails.create('  row.c  ');

            expect(padded).not.toBe(plain);
            expect(padded.expression).toBe(plain.expression);
            expect(padded.isSingleBinded).toBe(plain.isSingleBinded);
        });

        it('should keep one-time and plain forms of the same body apart', () => {
            const oneTime = ExpressionDetails.create('#row.d');
            const plain = ExpressionDetails.create('row.d');

            expect(oneTime).not.toBe(plain);
            expect(oneTime.isSingleBinded).toBe(true);
            expect(plain.isSingleBinded).toBe(false);
        });

        it('should return frozen-shape instances whose public fields are the parsed values', () => {
            const details = ExpressionDetails.create('@shared');
            expect(Object.keys(details).sort()).toEqual(['expression', 'isSingleBinded']);
        });
    });
});
