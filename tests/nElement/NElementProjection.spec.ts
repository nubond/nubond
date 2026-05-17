import { NElementProjection } from '../../src/nElement/NElementProjection';
import { Constants } from '../../src/Constants';

describe('NElementProjection', () => {
    const PREFIX = Constants.DEFAULT_PREFIX + Constants.DEFAULT_SEPARATOR;
    const PROJECTION_ATTR = PREFIX + Constants.PROJECTION_ATTRIBUTE_PREFIX_NAME;
    const PROJECTION_PARENT_ATTR = PREFIX + Constants.PROJECTION_PARENT_SLOT_ATTRIBUTE_PREFIX_NAME;
    const PROJECTION_REPLACE_ATTR = PREFIX + Constants.PROJECTION_REPLACE_SLOT_ATTRIBUTE_PREFIX_NAME;

    it('should construct without error on empty element', () => {
        const el = document.createElement('div');
        expect(() => new NElementProjection(el)).not.toThrow();
    });

    describe('cleanUp', () => {
        it('should remove all children when no fallback projection', () => {
            const el = document.createElement('div');
            const projection = new NElementProjection(el);
            
            el.innerHTML = '<p>child</p>';
            projection.cleanUp();
            expect(el.childNodes.length).toBe(0);
        });

        it('should restore fallback projection content', () => {
            const source = document.createElement('div');
            source.innerHTML = '<span>fallback content</span>';
            
            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            target.innerHTML = '<p>some content</p>';
            projection.cleanUp();
            
            // Should have restored fallback content
            expect(target.innerHTML).toContain('fallback content');
        });
    });

    describe('process with named projections', () => {
        it('should project named content into parent slots', () => {
            const source = document.createElement('div');
            const projected = document.createElement('span');
            projected.setAttribute(PROJECTION_ATTR, 'header');
            projected.textContent = 'Header Content';
            source.appendChild(projected);

            const target = document.createElement('div');
            const slot = document.createElement('div');
            slot.setAttribute(PROJECTION_PARENT_ATTR, 'header');
            target.appendChild(slot);

            const projection = new NElementProjection(source, target);
            projection.process();

            expect(slot.innerHTML).toContain('Header Content');
        });

        it('should project content into replace slots', () => {
            const source = document.createElement('div');
            const projected = document.createElement('span');
            projected.setAttribute(PROJECTION_ATTR, 'content');
            projected.textContent = 'Main Content';
            source.appendChild(projected);

            const target = document.createElement('div');
            const wrapper = document.createElement('div');
            const slot = document.createElement('div');
            slot.setAttribute(PROJECTION_REPLACE_ATTR, 'content');
            wrapper.appendChild(slot);
            target.appendChild(wrapper);

            const projection = new NElementProjection(source, target);
            projection.process();

            // The slot should have been replaced with projected content
            expect(wrapper.innerHTML).toContain('Main Content');
        });

        it('should handle unnamed projection', () => {
            const source = document.createElement('div');
            const projected = document.createElement('span');
            projected.setAttribute(PROJECTION_ATTR, '');
            projected.textContent = 'Default';
            source.appendChild(projected);

            const target = document.createElement('div');
            const slot = document.createElement('div');
            slot.setAttribute(PROJECTION_PARENT_ATTR, '');
            target.appendChild(slot);

            const projection = new NElementProjection(source, target);
            projection.process();

            expect(slot.innerHTML).toContain('Default');
        });
    });

    describe('process without projections', () => {
        it('should not throw when no projections defined', () => {
            const el = document.createElement('div');
            const projection = new NElementProjection(el);

            expect(() => projection.process()).not.toThrow();
        });
    });

    describe('constructor with text nodes and comment nodes', () => {
        it('should capture text nodes as fallback projection', () => {
            const source = document.createElement('div');
            source.appendChild(document.createTextNode('some text'));

            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            projection.cleanUp();
            expect(target.textContent).toContain('some text');
        });

        it('should skip comment nodes (default case)', () => {
            const source = document.createElement('div');
            source.appendChild(document.createComment('a comment'));
            source.appendChild(document.createTextNode('text'));

            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            projection.cleanUp();
            // Comment node is skipped, text node is captured as fallback
            expect(target.textContent).toContain('text');
        });

        it('should capture non-projected elements as fallback', () => {
            const source = document.createElement('div');
            const child = document.createElement('span');
            child.textContent = 'fallback child';
            source.appendChild(child);

            const target = document.createElement('div');
            const projection = new NElementProjection(source, target);

            projection.cleanUp();
            expect(target.innerHTML).toContain('fallback child');
        });

        it('should error on duplicate unnamed projections', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            const source = document.createElement('div');
            const proj1 = document.createElement('span');
            proj1.setAttribute(PROJECTION_ATTR, '');
            proj1.textContent = 'first';
            source.appendChild(proj1);

            const proj2 = document.createElement('div');
            proj2.setAttribute(PROJECTION_ATTR, '');
            proj2.textContent = 'second';
            source.appendChild(proj2);

            new NElementProjection(source);

            expect(errorSpy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, source, expect.stringContaining('Projection without name'));
            errorSpy.mockRestore();
        });
    });
});
