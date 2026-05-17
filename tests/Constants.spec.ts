import { Constants } from '../src/Constants';

describe('Constants', () => {
    afterEach(() => {
        // Reset to default non-W3C mode
        Constants.changeCompliancyWithW3C(false);
    });

    describe('DEFAULT_PREFIX', () => {
        it('should be "nb" in default mode', () => {
            expect(Constants.DEFAULT_PREFIX).toBe('nb');
        });

        it('should be "data-nb" in W3C compliant mode', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.DEFAULT_PREFIX).toBe('data-nb');
        });
    });

    describe('COMPLIANT_WITH_WC', () => {
        it('should be false by default', () => {
            expect(Constants.COMPLIANT_WITH_WC).toBe(false);
        });

        it('should be true after enabling W3C compliance', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.COMPLIANT_WITH_WC).toBe(true);
        });
    });

    describe('META_VALUE_SEPARATOR', () => {
        it('should be ":" in default mode', () => {
            expect(Constants.META_VALUE_SEPARATOR).toBe(':');
        });

        it('should be "--" in W3C compliant mode', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.META_VALUE_SEPARATOR).toBe('--');
        });
    });

    describe('DEFAULT_SEPARATOR', () => {
        it('should be "-"', () => {
            expect(Constants.DEFAULT_SEPARATOR).toBe('-');
        });
    });

    describe('handler attribute names', () => {
        it('should have VALUE_HANDLER_ATTRIBUTE_NAME as "value"', () => {
            expect(Constants.VALUE_HANDLER_ATTRIBUTE_NAME).toBe('value');
        });

        it('should have HTML_HANDLER_ATTRIBUTE_NAME as "html"', () => {
            expect(Constants.HTML_HANDLER_ATTRIBUTE_NAME).toBe('html');
        });

        it('should have CLASS_HANDLER_ATTRIBUTE_NAME as "class"', () => {
            expect(Constants.CLASS_HANDLER_ATTRIBUTE_NAME).toBe('class');
        });

        it('should have STYLE_HANDLER_ATTRIBUTE_NAME as "style"', () => {
            expect(Constants.STYLE_HANDLER_ATTRIBUTE_NAME).toBe('style');
        });

        it('should have IF_HANDLER_ATTRIBUTE_NAME as "if"', () => {
            expect(Constants.IF_HANDLER_ATTRIBUTE_NAME).toBe('if');
        });

        it('should have REPEAT_HANDLER_ATTRIBUTE_NAME as "repeat"', () => {
            expect(Constants.REPEAT_HANDLER_ATTRIBUTE_NAME).toBe('repeat');
        });

        it('should have EXEC_HANDLER_ATTRIBUTE_NAME as "exec"', () => {
            expect(Constants.EXEC_HANDLER_ATTRIBUTE_NAME).toBe('exec');
        });

        it('should have SWITCH_HANDLER_ATTRIBUTE_NAME as "switch"', () => {
            expect(Constants.SWITCH_HANDLER_ATTRIBUTE_NAME).toBe('switch');
        });

        it('should have CONTAINER_HANDLER_ATTRIBUTE_NAME as "container"', () => {
            expect(Constants.CONTAINER_HANDLER_ATTRIBUTE_NAME).toBe('container');
        });

        it('should have COMPONENT_MARKER_ATTRIBUTE_NAME as "component"', () => {
            expect(Constants.COMPONENT_MARKER_ATTRIBUTE_NAME).toBe('component');
        });

        it('should have TEMPLATE_HANDLER_ATTRIBUTE_NAME as "template"', () => {
            expect(Constants.TEMPLATE_HANDLER_ATTRIBUTE_NAME).toBe('template');
        });

        it('should have BOUND_HANDLER_ATTRIBUTE_NAME as "bound"', () => {
            expect(Constants.BOUND_HANDLER_ATTRIBUTE_NAME).toBe('bound');
        });
    });

    describe('prefix handler names', () => {
        it('should have PROPERTY_HANDLER_ATTRIBUTE_NAME as "prop"', () => {
            expect(Constants.PROPERTY_HANDLER_ATTRIBUTE_NAME).toBe('prop');
        });

        it('should have ATTRIBUTE_HANDLER_ATTRIBUTE_NAME as "attr"', () => {
            expect(Constants.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME).toBe('attr');
        });

        it('should have EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME as "event"', () => {
            expect(Constants.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME).toBe('event');
        });

        it('should have VARIABLE_HANDLER_PREFIX_NAME as "var"', () => {
            expect(Constants.VARIABLE_HANDLER_PREFIX_NAME).toBe('var');
        });
    });

    describe('execution param names', () => {
        it('should have INDEX_EXECUTION_PARAM_NAME as "index"', () => {
            expect(Constants.INDEX_EXECUTION_PARAM_NAME).toBe('index');
        });

        it('should have ITEM_EXECUTION_PARAM_NAME as "item"', () => {
            expect(Constants.ITEM_EXECUTION_PARAM_NAME).toBe('item');
        });

        it('should have TOTAL_COUNT_EXECUTION_PARAM_NAME as "count"', () => {
            expect(Constants.TOTAL_COUNT_EXECUTION_PARAM_NAME).toBe('count');
        });

        it('should have EVENT_EXECUTION_PARAM_NAME as "event"', () => {
            expect(Constants.EVENT_EXECUTION_PARAM_NAME).toBe('event');
        });

        it('should have NATIVE_ELEMENT_EXECUTION_PARAM_NAME as "nativeElement"', () => {
            expect(Constants.NATIVE_ELEMENT_EXECUTION_PARAM_NAME).toBe('nativeElement');
        });

        it('should have ELEMENT_EXECUTION_PARAM_NAME as "element"', () => {
            expect(Constants.ELEMENT_EXECUTION_PARAM_NAME).toBe('element');
        });

        it('should have UNSUBSCRIBE_EXECUTION_PARAM_NAME as "unSubscribe"', () => {
            expect(Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME).toBe('unSubscribe');
        });

        it('should have ROUTER_EXECUTION_PARAM_NAME as "router"', () => {
            expect(Constants.ROUTER_EXECUTION_PARAM_NAME).toBe('router');
        });

        it('should have DATA_EXECUTION_PARAM_NAME as "data"', () => {
            expect(Constants.DATA_EXECUTION_PARAM_NAME).toBe('data');
        });
    });

    describe('binding prefixes', () => {
        it('should have "#" as SINGLE_BIND_PREFIX_CHAR', () => {
            expect(Constants.SINGLE_BIND_PREFIX_CHAR).toBe('#');
        });

        it('should have "@" as CONSTANT_BIND_PREFIX_CHAR', () => {
            expect(Constants.CONSTANT_BIND_PREFIX_CHAR).toBe('@');
        });
    });

    describe('KNOWN_HANDLERS', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(Constants.KNOWN_HANDLERS)).toBe(true);
            expect(Constants.KNOWN_HANDLERS.length).toBeGreaterThan(0);
        });

        it('should include nb-value by default', () => {
            expect(Constants.KNOWN_HANDLERS).toContain('nb-value');
        });

        it('should include nb-if by default', () => {
            expect(Constants.KNOWN_HANDLERS).toContain('nb-if');
        });

        it('should update when W3C mode changes', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.KNOWN_HANDLERS).toContain('data-nb-value');
            expect(Constants.KNOWN_HANDLERS).not.toContain('nb-value');
        });
    });

    describe('KNOWN_PREFIX_HANDLERS', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(Constants.KNOWN_PREFIX_HANDLERS)).toBe(true);
            expect(Constants.KNOWN_PREFIX_HANDLERS.length).toBeGreaterThan(0);
        });

        it('should include nb-repeat by default', () => {
            expect(Constants.KNOWN_PREFIX_HANDLERS).toContain('nb-repeat');
        });

        it('should include nb-event by default', () => {
            expect(Constants.KNOWN_PREFIX_HANDLERS).toContain('nb-event');
        });
    });

    describe('DEFAULT_HIDE_CLASS_NAME', () => {
        it('should be "nb-hidden" in default mode', () => {
            expect(Constants.DEFAULT_HIDE_CLASS_NAME).toBe('nb-hidden');
        });

        it('should be "data-nb-hidden" in W3C mode', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.DEFAULT_HIDE_CLASS_NAME).toBe('data-nb-hidden');
        });
    });

    describe('DEFAULT_HIDE_STYLE', () => {
        it('should contain the hide class name', () => {
            expect(Constants.DEFAULT_HIDE_STYLE).toContain('nb-hidden');
        });

        it('should contain display: none', () => {
            expect(Constants.DEFAULT_HIDE_STYLE).toContain('display: none !important');
        });
    });

    describe('DEFAULT_PROCESSING_HIDE_STYLE', () => {
        it('should contain nb-template', () => {
            expect(Constants.DEFAULT_PROCESSING_HIDE_STYLE).toContain('nb-template');
        });

        it('should contain display: none', () => {
            expect(Constants.DEFAULT_PROCESSING_HIDE_STYLE).toContain('display: none');
        });
    });

    describe('changeCompliancyWithW3C', () => {
        it('should not re-apply when setting same value', () => {
            // Default is false, setting to false should be no-op
            const currentPrefix = Constants.DEFAULT_PREFIX;
            Constants.changeCompliancyWithW3C(false);
            expect(Constants.DEFAULT_PREFIX).toBe(currentPrefix);
        });

        it('should toggle between modes', () => {
            expect(Constants.DEFAULT_PREFIX).toBe('nb');

            Constants.changeCompliancyWithW3C(true);
            expect(Constants.DEFAULT_PREFIX).toBe('data-nb');

            Constants.changeCompliancyWithW3C(false);
            expect(Constants.DEFAULT_PREFIX).toBe('nb');
        });
    });

    describe('KNOWN_HANDLERS_SET', () => {
        it('should be a Set', () => {
            expect(Constants.KNOWN_HANDLERS_SET).toBeInstanceOf(Set);
        });

        it('should contain known handler names', () => {
            expect(Constants.KNOWN_HANDLERS_SET.has('nb-value')).toBe(true);
            expect(Constants.KNOWN_HANDLERS_SET.has('nb-if')).toBe(true);
        });

        it('should update when W3C mode changes', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.KNOWN_HANDLERS_SET.has('data-nb-value')).toBe(true);
            expect(Constants.KNOWN_HANDLERS_SET.has('nb-value')).toBe(false);
        });
    });

    describe('KNOWN_HANDLERS_WITHOUT_VALUE', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(Constants.KNOWN_HANDLERS_WITHOUT_VALUE)).toBe(true);
            expect(Constants.KNOWN_HANDLERS_WITHOUT_VALUE.length).toBeGreaterThan(0);
        });

        it('should not contain nb-value among its items', () => {
            // This array excludes the value handler
            const hasValueHandler = Constants.KNOWN_HANDLERS_WITHOUT_VALUE
                .some(h => h === 'nb-value' || h === 'data-nb-value');
            expect(hasValueHandler).toBe(false);
        });
    });

    describe('KNOW_HANDLER_EXTENSIONS', () => {
        it('should be a non-empty Set', () => {
            expect(Constants.KNOW_HANDLER_EXTENSIONS).toBeInstanceOf(Set);
            expect(Constants.KNOW_HANDLER_EXTENSIONS.size).toBeGreaterThan(0);
        });

        it('should contain nb-projection by default', () => {
            expect(Constants.KNOW_HANDLER_EXTENSIONS.has('nb-projection')).toBe(true);
        });

        it('should update when W3C mode changes', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.KNOW_HANDLER_EXTENSIONS.has('data-nb-projection')).toBe(true);
        });
    });

    describe('HANDLER_READY_ATTRIBUTE_SUFFIX', () => {
        it('should be defined', () => {
            expect(Constants.HANDLER_READY_ATTRIBUTE_SUFFIX).toBeDefined();
            expect(typeof Constants.HANDLER_READY_ATTRIBUTE_SUFFIX).toBe('string');
        });
    });

    describe('RESERVED_CONTEXT_NAMES', () => {
        it('should be a Set', () => {
            expect(Constants.RESERVED_CONTEXT_NAMES).toBeInstanceOf(Set);
        });

        it('should contain repeat execution param names', () => {
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.ITEM_EXECUTION_PARAM_NAME)).toBe(true);
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.INDEX_EXECUTION_PARAM_NAME)).toBe(true);
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.TOTAL_COUNT_EXECUTION_PARAM_NAME)).toBe(true);
        });

        it('should contain event execution param names (lowercased)', () => {
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.EVENT_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.DATA_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.ROUTER_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.UNSUBSCRIBE_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
        });

        it('should contain element-binding execution param names (lowercased)', () => {
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.NATIVE_ELEMENT_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.RESERVED_CONTEXT_NAMES.has(Constants.ELEMENT_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
        });

        it('should store all reserved names in lowercase form (M-12 fix)', () => {
            for (const name of Constants.RESERVED_CONTEXT_NAMES) {
                expect(name).toBe(name.toLowerCase());
            }
        });

        it('should not contain unrelated names', () => {
            expect(Constants.RESERVED_CONTEXT_NAMES.has('foo')).toBe(false);
            expect(Constants.RESERVED_CONTEXT_NAMES.has('myValue')).toBe(false);
        });

        it('should be immutable (frozen)', () => {
            expect(Object.isFrozen(Constants.RESERVED_CONTEXT_NAMES)).toBe(true);
        });
    });

    describe('readonly collection invariants', () => {
        it('KNOWN_HANDLERS should be frozen', () => {
            expect(Object.isFrozen(Constants.KNOWN_HANDLERS)).toBe(true);
        });

        it('KNOWN_HANDLERS_SET should be frozen', () => {
            expect(Object.isFrozen(Constants.KNOWN_HANDLERS_SET)).toBe(true);
        });

        it('KNOWN_PREFIX_HANDLERS should be frozen', () => {
            expect(Object.isFrozen(Constants.KNOWN_PREFIX_HANDLERS)).toBe(true);
        });

        it('KNOWN_HANDLERS_WITHOUT_VALUE should be frozen', () => {
            expect(Object.isFrozen(Constants.KNOWN_HANDLERS_WITHOUT_VALUE)).toBe(true);
        });

        it('KNOW_HANDLER_EXTENSIONS should be frozen', () => {
            expect(Object.isFrozen(Constants.KNOW_HANDLER_EXTENSIONS)).toBe(true);
        });

        it('KNOW_HANDLER_EXTENSIONS_WITHOUT_VALUES should be frozen', () => {
            expect(Object.isFrozen(Constants.KNOW_HANDLER_EXTENSIONS_WITHOUT_VALUES)).toBe(true);
        });
    });

    describe('additional handler attribute names', () => {
        it('should have IN_HANDLER_ATTRIBUTE_NAME defined', () => {
            expect(Constants.IN_HANDLER_ATTRIBUTE_NAME).toBeDefined();
        });

        it('should have SWITCH_CASE_HANDLER_ATTRIBUTE_NAME defined', () => {
            expect(Constants.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME).toBeDefined();
        });

        it('should have SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME defined', () => {
            expect(Constants.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME).toBeDefined();
        });

        it('should have ASPECT_HANDLER_PREFIX_NAME defined', () => {
            expect(Constants.ASPECT_HANDLER_PREFIX_NAME).toBeDefined();
        });

        it('should have PROJECTION_ATTRIBUTE_PREFIX_NAME defined', () => {
            expect(Constants.PROJECTION_ATTRIBUTE_PREFIX_NAME).toBeDefined();
        });
    });
});
