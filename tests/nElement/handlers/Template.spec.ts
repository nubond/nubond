import { Template } from '../../../src/nElement/handlers/Template';
import { Attributes } from '../../../src/nElement/handlers/Attributes';
import { Environment } from '../../../src/Environment';
import { Constants } from '../../../src/Constants';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

describe('Template handler', () => {
    function createElementWithAttr(expression?: string): Element {
        const el = document.createElement('div');
        if (expression !== undefined) {
            el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${Constants.TEMPLATE_HANDLER_ATTRIBUTE_NAME}`, expression);
        }
        return el;
    }

    it('should have no expression when attribute missing', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Template(el, attrs, jest.fn(), jest.fn());

        expect(handler.hasNExpression).toBe(false);
    });

    it('isDirty should always be false', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Template(el, attrs, jest.fn(), jest.fn());

        expect(handler.isDirty).toBe(false);
    });

    it('commit should always return false', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Template(el, attrs, jest.fn(), jest.fn());

        expect(handler.commit()).toBe(false);
    });

    it('should return executionParams from bind', () => {
        const el = document.createElement('div');
        const attrs = new Attributes(el);
        const handler = new Template(el, attrs, jest.fn(), jest.fn());

        const params = { x: 1 } as any;
        expect(handler.bind(params, () => 'x')).toBe(params);
    });

    it('should detect named template reference starting with @', () => {
        // Register a template first
        Environment.addTemplate('test-tpl', '<p>content</p>', undefined);

        const el = createElementWithAttr('@test-tpl');
        const attrs = new Attributes(el);
        const constructSubTree = jest.fn();
        const requestDetectChanges = jest.fn();
        const handler = new Template(el, attrs, constructSubTree, requestDetectChanges);

        expect(handler.hasNExpression).toBe(true);
    });

    describe('constructor error paths', () => {
        it('should error when expression does not start with @', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = createElementWithAttr('noAtSign');
            const attrs = new Attributes(el);
            const handler = new Template(el, attrs, jest.fn(), jest.fn());

            expect(handler.hasNExpression).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should error when template name is not registered', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const el = createElementWithAttr('@non-existent-template');
            const attrs = new Attributes(el);
            const handler = new Template(el, attrs, jest.fn(), jest.fn());

            expect(handler.hasNExpression).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('constructor success', () => {
        it('should detect template name from @templateName expression', () => {
            Environment.addTemplate('my-template', '<span>hello</span>', undefined);

            const el = createElementWithAttr('@my-template');
            const attrs = new Attributes(el);
            const handler = new Template(el, attrs, jest.fn(), jest.fn());

            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression).toBeDefined();
            expect(handler.nExpression!.expression).toBe('"my-template"');
        });
    });

    describe('tryPrepare async callback', () => {
        it('should call commit and requestDetectChanges when asyncCallBack is true', () => {
            // Mock Environment.templates to control tryPrepare
            const templateContent = document.createElement('template');
            templateContent.innerHTML = '<p>async content</p>';
            const templates = {
                has: jest.fn().mockReturnValue(true),
                tryPrepare: jest.fn().mockImplementation((_name: string, cb: (asyncCallBack: boolean) => void) => {
                    cb(true); // async callback = true
                    return true;
                }),
                get: jest.fn().mockReturnValue(templateContent.content),
            };
            (Environment as any)._templates = templates;
            Object.defineProperty(Environment, 'templates', { get: () => templates, configurable: true });

            const el = createElementWithAttr('@async-tpl');
            const attrs = new Attributes(el);
            const constructSubTree = jest.fn();
            const requestDetectChanges = jest.fn();
            const commitSpy = jest.spyOn(attrs, 'commit');

            const handler = new Template(el, attrs, constructSubTree, requestDetectChanges);

            expect(handler.hasNExpression).toBe(true);
            expect(commitSpy).toHaveBeenCalled();
            expect(requestDetectChanges).toHaveBeenCalled();
            expect(constructSubTree).toHaveBeenCalled();
        });

        it('should NOT call commit or requestDetectChanges when asyncCallBack is false', () => {
            const templateContent = document.createElement('template');
            templateContent.innerHTML = '<p>sync content</p>';
            const templates = {
                has: jest.fn().mockReturnValue(true),
                tryPrepare: jest.fn().mockImplementation((_name: string, cb: (asyncCallBack: boolean) => void) => {
                    cb(false); // sync callback = false
                    return true;
                }),
                get: jest.fn().mockReturnValue(templateContent.content),
            };
            (Environment as any)._templates = templates;
            Object.defineProperty(Environment, 'templates', { get: () => templates, configurable: true });

            const el = createElementWithAttr('@sync-tpl');
            const attrs = new Attributes(el);
            const constructSubTree = jest.fn();
            const requestDetectChanges = jest.fn();
            const commitSpy = jest.spyOn(attrs, 'commit');

            const handler = new Template(el, attrs, constructSubTree, requestDetectChanges);

            expect(handler.hasNExpression).toBe(true);
            expect(constructSubTree).toHaveBeenCalled();
            // Sync: commit and requestDetectChanges should NOT be called
            expect(commitSpy).not.toHaveBeenCalled();
            expect(requestDetectChanges).not.toHaveBeenCalled();
        });
    });
});
