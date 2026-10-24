import { InitializableBase } from '../../../../src/nElement/handlers/base/InitializableBase';
import { Constants } from '../../../../src/Constants';

// --- Concrete test subclass --------------------------------------------------

class TestInitializable extends InitializableBase {
    public get exposedNativeElement() { return this.nativeElement; }
    public get exposedHandlerAttributeName() { return this.handlerAttributeName; }

    public exposedMarkAsReady() { this.markAsReady(); }
}

function readyAttributeName(handlerAttributeName: string): string {
    return Constants.DEFAULT_PREFIX + Constants.DEFAULT_SEPARATOR +
           handlerAttributeName +
           Constants.DEFAULT_SEPARATOR + Constants.HANDLER_READY_ATTRIBUTE_SUFFIX;
}

// --- Tests -------------------------------------------------------------------

describe('InitializableBase', () => {
    describe('constructor', () => {
        it('stores the native element and the handler attribute name', () => {
            const el = document.createElement('div');
            const handler = new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME);

            expect(handler.exposedNativeElement).toBe(el);
            expect(handler.exposedHandlerAttributeName).toBe(Constants.IF_HANDLER_ATTRIBUTE_NAME);
        });

        it('does not touch the element', () => {
            const el = document.createElement('div');
            new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME);

            expect(el.attributes.length).toBe(0);
        });
    });

    describe('markAsReady', () => {
        it('writes the ready attribute straight to the element with an empty value', () => {
            const el = document.createElement('div');
            const handler = new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME);

            handler.exposedMarkAsReady();

            expect(el.getAttribute(`nb-${Constants.IF_HANDLER_ATTRIBUTE_NAME}-ready`)).toBe('');
            expect(el.hasAttribute(readyAttributeName(Constants.IF_HANDLER_ATTRIBUTE_NAME))).toBe(true);
        });

        it('uses the handler attribute name, so the processing-hide selector of that handler stops matching', () => {
            const names = [
                Constants.IF_HANDLER_ATTRIBUTE_NAME,
                Constants.SWITCH_HANDLER_ATTRIBUTE_NAME,
                Constants.REPEAT_HANDLER_ATTRIBUTE_NAME,
                Constants.TEMPLATE_HANDLER_ATTRIBUTE_NAME,
                Constants.CONTAINER_HANDLER_ATTRIBUTE_NAME,
                Constants.COMPONENT_MARKER_ATTRIBUTE_NAME
            ];

            for (const name of names) {
                const el = document.createElement('div');
                el.setAttribute(`${Constants.DEFAULT_PREFIX}${Constants.DEFAULT_SEPARATOR}${name}`, 'x');
                const selector = `[nb-${name}]:not([nb-${name}-ready])`;
                expect(el.matches(selector)).toBe(true);

                new TestInitializable(el, name).exposedMarkAsReady();

                expect(el.matches(selector)).toBe(false);
            }
        });

        it('writes the attribute only once — a marker removed afterwards is not restored', () => {
            const el = document.createElement('div');
            const handler = new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME);
            const setAttributeSpy = jest.spyOn(el, 'setAttribute');

            handler.exposedMarkAsReady();
            el.removeAttribute(readyAttributeName(Constants.IF_HANDLER_ATTRIBUTE_NAME));
            handler.exposedMarkAsReady();

            expect(setAttributeSpy).toHaveBeenCalledTimes(1);
            expect(el.hasAttribute(readyAttributeName(Constants.IF_HANDLER_ATTRIBUTE_NAME))).toBe(false);
        });

        it('keeps the ready state per handler instance', () => {
            const el = document.createElement('div');
            const ifHandler = new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME);
            const repeatHandler = new TestInitializable(el, Constants.REPEAT_HANDLER_ATTRIBUTE_NAME);

            ifHandler.exposedMarkAsReady();

            expect(el.hasAttribute(readyAttributeName(Constants.IF_HANDLER_ATTRIBUTE_NAME))).toBe(true);
            expect(el.hasAttribute(readyAttributeName(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME))).toBe(false);

            repeatHandler.exposedMarkAsReady();

            expect(el.hasAttribute(readyAttributeName(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME))).toBe(true);
        });

        it('lets a fresh handler on the same element mark it again (re-bind)', () => {
            const el = document.createElement('div');
            new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME).exposedMarkAsReady();
            el.removeAttribute(readyAttributeName(Constants.IF_HANDLER_ATTRIBUTE_NAME));

            new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME).exposedMarkAsReady();

            expect(el.hasAttribute(readyAttributeName(Constants.IF_HANDLER_ATTRIBUTE_NAME))).toBe(true);
        });

        it('uses the data- prefix in W3C compliance mode', () => {
            Constants.changeCompliancyWithW3C(true);
            try {
                const el = document.createElement('div');
                new TestInitializable(el, Constants.IF_HANDLER_ATTRIBUTE_NAME).exposedMarkAsReady();

                expect(el.hasAttribute(`data-nb-${Constants.IF_HANDLER_ATTRIBUTE_NAME}-ready`)).toBe(true);
                expect(el.hasAttribute(`nb-${Constants.IF_HANDLER_ATTRIBUTE_NAME}-ready`)).toBe(false);
            } finally {
                Constants.changeCompliancyWithW3C(false);
            }
        });
    });
});
