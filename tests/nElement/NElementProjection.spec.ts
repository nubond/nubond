import { NElementProjection } from '../../src/nElement/NElementProjection';
import { Constants } from '../../src/Constants';

describe('NElementProjection', () => {
    const PROJECTION_ATTR = () => Constants.HANDLERS.PROJECTION_ATTRIBUTE_NAME;
    const ENCAPSULATED_ATTR = () => Constants.HANDLERS.ENCAPSULATED_MARKER_ATTRIBUTE_NAME;
    const PROJECT_TO_ATTR = () => Constants.HANDLERS.PROJECT_TO_ATTRIBUTE_NAME;
    const PROJECT_INSTEAD_ATTR = () => Constants.HANDLERS.PROJECT_INSTEAD_ATTRIBUTE_NAME;

    function projected(name: string, text: string, tag = 'span'): HTMLElement {
        const el = document.createElement(tag);
        el.setAttribute(PROJECTION_ATTR(), name);
        el.textContent = text;
        return el;
    }

    function slot(attr: string, name: string, content = ''): HTMLElement {
        const el = document.createElement('div');
        el.setAttribute(attr, name);
        el.innerHTML = content;
        return el;
    }

    it('should construct without error on empty element', () => {
        const el = document.createElement('div');
        expect(() => new NElementProjection(el)).not.toThrow();
    });

    describe('fallback', () => {
        it('returns false and leaves the target untouched when there is no fallback content', () => {
            const el = document.createElement('div');
            const projection = new NElementProjection(el);

            el.innerHTML = '<p>child</p>';

            expect(projection.fallback()).toBe(false);
            expect(el.innerHTML).toBe('<p>child</p>');
        });

        it('replaces the target children with the captured fallback content and returns true', () => {
            const source = document.createElement('div');
            source.innerHTML = '<span>fallback content</span>';

            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            target.innerHTML = '<p>some content</p>';

            expect(projection.fallback()).toBe(true);
            expect(target.innerHTML).toBe('<span>fallback content</span>');
        });

        it('restores a fresh copy on every call', () => {
            const source = document.createElement('div');
            source.innerHTML = '<span>fb</span>';
            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            projection.fallback();
            const first = target.firstElementChild;
            projection.fallback();

            expect(target.innerHTML).toBe('<span>fb</span>');
            expect(target.firstElementChild).not.toBe(first);
        });

        it('does not include projected elements in the fallback content', () => {
            const source = document.createElement('div');
            source.appendChild(projected('a', 'projected'));
            source.appendChild(document.createElement('i')).textContent = 'fb';
            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            projection.fallback();

            expect(target.innerHTML).toBe('<i>fb</i>');
        });
    });

    describe('constructor', () => {
        it('removes projected elements from the source and keeps the rest', () => {
            const source = document.createElement('div');
            source.appendChild(projected('a', 'A'));
            const keep = document.createElement('i');
            source.appendChild(keep);

            new NElementProjection(source);

            expect(source.querySelector(`[${PROJECTION_ATTR()}]`)).toBeNull();
            expect(source.firstElementChild).toBe(keep);
        });

        it('only picks up direct children as projections', () => {
            const source = document.createElement('div');
            const wrapper = document.createElement('section');
            wrapper.appendChild(projected('a', 'nested'));
            source.appendChild(wrapper);
            const target = document.createElement('div');
            target.appendChild(slot(PROJECT_TO_ATTR(), 'a'));

            const projection = new NElementProjection(source, target);

            expect(projection.project()).toEqual([]);
            expect(source.querySelector(`[${PROJECTION_ATTR()}]`)).not.toBeNull();
        });

        it('should capture text nodes as fallback projection', () => {
            const source = document.createElement('div');
            source.appendChild(document.createTextNode('some text'));

            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            projection.fallback();
            expect(target.textContent).toBe('some text');
        });

        it('should drop top-level comment nodes from the restored fallback content (L-36, by design)', () => {
            const source = document.createElement('div');
            source.appendChild(document.createComment('top-level marker'));
            const kept = document.createElement('span');
            kept.appendChild(document.createComment('nested marker'));
            kept.appendChild(document.createTextNode('fallback'));
            source.appendChild(kept);

            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            projection.fallback();
            // Only element and text children of the host are kept; an element is cloned deep,
            // so a comment nested inside it survives.
            expect(target.innerHTML).toBe('<span><!--nested marker-->fallback</span>');
        });

        it('a host with only comment children has no fallback', () => {
            const source = document.createElement('div');
            source.appendChild(document.createComment('only a comment'));
            const target = document.createElement('div');
            target.innerHTML = '<b>x</b>';

            expect(new NElementProjection(source, target).fallback()).toBe(false);
            expect(target.innerHTML).toBe('<b>x</b>');
        });

        it('should error on duplicate unnamed projections and keep the first', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            const source = document.createElement('div');
            source.appendChild(projected('', 'first'));
            source.appendChild(projected('', 'second', 'div'));
            const target = document.createElement('div');
            const s = slot(PROJECT_TO_ATTR(), '');
            target.appendChild(s);

            new NElementProjection(source, target).project();

            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, source, expect.stringContaining('Projection without name'));
            expect(s.textContent).toBe('first');
            errorSpy.mockRestore();
        });
    });

    describe('project', () => {
        it('nb-project-to replaces the slot children with a clone and returns it', () => {
            const source = document.createElement('div');
            const original = projected('header', 'Header Content');
            source.appendChild(original);

            const target = document.createElement('div');
            const s = slot(PROJECT_TO_ATTR(), 'header', '<em>default</em>');
            target.appendChild(s);

            const result = new NElementProjection(source, target).project();

            expect(result.length).toBe(1);
            expect(s.childNodes.length).toBe(1);
            expect(s.firstElementChild).toBe(result[0]);
            expect(result[0]).not.toBe(original);
            expect(s.textContent).toBe('Header Content');
            expect(s.hasAttribute(PROJECT_TO_ATTR())).toBe(true);
        });

        it('nb-project-instead replaces the slot element itself', () => {
            const source = document.createElement('div');
            source.appendChild(projected('content', 'Main Content'));

            const target = document.createElement('div');
            const wrapper = document.createElement('div');
            const s = slot(PROJECT_INSTEAD_ATTR(), 'content', 'default');
            wrapper.appendChild(s);
            target.appendChild(wrapper);

            const result = new NElementProjection(source, target).project();

            expect(result.length).toBe(1);
            expect(s.parentNode).toBeNull();
            expect(wrapper.firstElementChild).toBe(result[0]);
            expect(wrapper.textContent).toBe('Main Content');
        });

        it('the default projection goes to an unnamed slot', () => {
            const source = document.createElement('div');
            source.appendChild(projected('', 'Default'));

            const target = document.createElement('div');
            const s = slot(PROJECT_TO_ATTR(), '');
            target.appendChild(s);

            new NElementProjection(source, target).project();

            expect(s.textContent).toBe('Default');
        });

        it('fills every slot with the same name with its own clone', () => {
            const source = document.createElement('div');
            source.appendChild(projected('a', 'A'));

            const target = document.createElement('div');
            const s1 = slot(PROJECT_TO_ATTR(), 'a');
            const s2 = slot(PROJECT_TO_ATTR(), 'a');
            target.append(s1, s2);

            const result = new NElementProjection(source, target).project();

            expect(result.length).toBe(2);
            expect(result[0]).not.toBe(result[1]);
            expect(s1.textContent).toBe('A');
            expect(s2.textContent).toBe('A');
        });

        it('leaves unmatched slots and their default content alone', () => {
            const source = document.createElement('div');
            source.appendChild(projected('a', 'A'));

            const target = document.createElement('div');
            const to = slot(PROJECT_TO_ATTR(), 'missing', '<i>keep-to</i>');
            const instead = slot(PROJECT_INSTEAD_ATTR(), 'missing', '<i>keep-instead</i>');
            target.append(to, instead);

            const result = new NElementProjection(source, target).project();

            expect(result).toEqual([]);
            expect(to.innerHTML).toBe('<i>keep-to</i>');
            expect(instead.parentNode).toBe(target);
            expect(instead.innerHTML).toBe('<i>keep-instead</i>');
        });

        it('returns an empty array and does not throw when no projections are defined', () => {
            const el = document.createElement('div');
            el.appendChild(slot(PROJECT_TO_ATTR(), ''));
            const projection = new NElementProjection(el);

            expect(projection.project()).toEqual([]);
        });

        it('each project() call inserts fresh clones', () => {
            const source = document.createElement('div');
            source.appendChild(projected('', 'x'));
            const target = document.createElement('div');
            const s = slot(PROJECT_TO_ATTR(), '');
            target.appendChild(s);
            const projection = new NElementProjection(source, target);

            const first = projection.project()[0];
            const second = projection.project()[0];

            expect(first).not.toBe(second);
            expect(s.firstElementChild).toBe(second);
        });
    });

    describe('encapsulation marker', () => {
        function projectOne(encapsulated?: boolean): Element {
            const source = document.createElement('div');
            source.appendChild(projected('', 'x'));
            const target = document.createElement('div');
            target.appendChild(slot(PROJECT_TO_ATTR(), ''));
            const projection = encapsulated === undefined
                                    ? new NElementProjection(source, target)
                                    : new NElementProjection(source, target, encapsulated);
            return projection.project()[0];
        }

        it('marks projected clones with the encapsulated attribute by default', () => {
            const clone = projectOne();

            expect(clone.hasAttribute(ENCAPSULATED_ATTR())).toBe(true);
            expect(clone.hasAttribute(PROJECTION_ATTR())).toBe(true);
            expect(NElementProjection.isEncapsulatedProjection(clone)).toBe(true);
            expect(NElementProjection.isProjection(clone)).toBe(true);
        });

        it('does not mark clones when encapsulated is false (nb-template)', () => {
            const clone = projectOne(false);

            expect(clone.hasAttribute(ENCAPSULATED_ATTR())).toBe(false);
            expect(NElementProjection.isEncapsulatedProjection(clone)).toBe(false);
            expect(NElementProjection.isProjection(clone)).toBe(true);
        });

        it('does not mark the original source element', () => {
            const source = document.createElement('div');
            const original = projected('', 'x');
            source.appendChild(original);

            new NElementProjection(source);

            expect(original.hasAttribute(ENCAPSULATED_ATTR())).toBe(false);
        });

        it('a copy of a marked clone stays marked (re-projection / nb-repeat rows)', () => {
            const copy = projectOne().cloneNode(true) as Element;

            expect(NElementProjection.isEncapsulatedProjection(copy)).toBe(true);
        });

        it('isProjection / isEncapsulatedProjection are false for plain elements', () => {
            const el = document.createElement('div');

            expect(NElementProjection.isProjection(el)).toBe(false);
            expect(NElementProjection.isEncapsulatedProjection(el)).toBe(false);
        });

        describe('W3C mode', () => {
            beforeEach(() => Constants.changeCompliancyWithW3C(true));
            afterEach(() => Constants.changeCompliancyWithW3C(false));

            it('uses the data- prefixed names for detection, slots and the marker', () => {
                const source = document.createElement('div');
                const p = document.createElement('b');
                p.setAttribute('data-nb-projection', 'a');
                p.textContent = 'w3c';
                source.appendChild(p);
                const target = document.createElement('div');
                const s = document.createElement('div');
                s.setAttribute('data-nb-project-to', 'a');
                target.appendChild(s);

                const clone = new NElementProjection(source, target).project()[0];

                expect(s.textContent).toBe('w3c');
                expect(clone.hasAttribute('data-nb-encapsulated')).toBe(true);
                expect(clone.hasAttribute('nb-encapsulated')).toBe(false);
                expect(NElementProjection.isEncapsulatedProjection(clone)).toBe(true);
            });

            it('ignores non-prefixed nb-projection in W3C mode', () => {
                const source = document.createElement('div');
                const p = document.createElement('b');
                p.setAttribute('nb-projection', '');
                source.appendChild(p);

                new NElementProjection(source);

                expect(source.firstElementChild).toBe(p);
            });
        });
    });

    describe('L-34: duplicate named projections', () => {
        function createSource(...entries: Array<[string, string]>): HTMLElement {
            const source = document.createElement('div');
            for (const [name, text] of entries) {
                source.appendChild(projected(name, text));
            }
            return source;
        }

        it('keeps the first same-named projection and logs the duplicate', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            const source = createSource(['header', 'first'], ['header', 'second']);
            const target = document.createElement('div');
            const s = slot(PROJECT_TO_ATTR(), 'header');
            target.appendChild(s);

            new NElementProjection(source, target).project();

            expect(s.textContent).toBe('first');
            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, source,
                'element projection data is corrupted. Projection with duplicated name found: header.');
            errorSpy.mockRestore();
        });

        it('logs once per extra duplicate and keeps the first for nb-project-instead too', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            const source = createSource(['body', 'one'], ['body', 'two'], ['body', 'three']);
            const target = document.createElement('div');
            const wrapper = document.createElement('div');
            wrapper.appendChild(slot(PROJECT_INSTEAD_ATTR(), 'body'));
            target.appendChild(wrapper);

            new NElementProjection(source, target).project();

            expect(wrapper.textContent).toBe('one');
            expect(errorSpy).toHaveBeenCalledTimes(2);
            errorSpy.mockRestore();
        });

        it('does not turn the skipped duplicate into fallback content', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            const source = createSource(['header', 'first'], ['header', 'second']);
            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            target.innerHTML = '<p>rendered</p>';

            expect(projection.fallback()).toBe(false);
            expect(target.innerHTML).toBe('<p>rendered</p>');
            errorSpy.mockRestore();
        });

        it('logs nothing for distinct names', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            const source = createSource(['header', 'h'], ['footer', 'f'], ['', 'default']);
            new NElementProjection(source);

            expect(errorSpy).not.toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });
});
