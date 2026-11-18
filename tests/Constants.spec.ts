import { Constants } from '../src/Constants';

describe('Constants', () => {
    afterEach(() => {
        // Reset to default non-W3C mode
        Constants.changeCompliancyWithW3C(false);
    });

    describe('PREFIX', () => {
        it('should be "nb" in default mode', () => {
            expect(Constants.PREFIX).toBe('nb');
        });

        it('should be "data-nb" in W3C compliant mode', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.PREFIX).toBe('data-nb');
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

    describe('PREFIX_AND_SEPARATOR', () => {
        it('should be "nb-" in default mode', () => {
            expect(Constants.PREFIX_AND_SEPARATOR).toBe('nb-');
        });

        it('should be "data-nb-" in W3C compliant mode', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.PREFIX_AND_SEPARATOR).toBe('data-nb-');
        });

        it('should be the prefix every full handler name starts with, in both modes', () => {
            for (const compliant of [false, true]) {
                Constants.changeCompliancyWithW3C(compliant);
                for (const name of [...Constants.HANDLERS.KNOWN_HANDLERS, ...Constants.HANDLERS.KNOWN_PREFIX_HANDLERS,
                                    ...Constants.HANDLERS.KNOWN_HANDLER_PREFIX_EXTENSIONS, ...Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES]) {
                    expect(name.startsWith(Constants.PREFIX_AND_SEPARATOR)).toBe(true);
                }
            }
        });
    });

    // The flat static API was split into three groups. STYLES and HANDLERS depend on the prefix, so
    // changeCompliancyWithW3C replaces them with new instances; EXPRESSIONS does not depend on it.
    describe('constant groups', () => {
        it('should keep the same instances while the mode does not change', () => {
            const styles = Constants.STYLES, handlers = Constants.HANDLERS, expressions = Constants.EXPRESSIONS;

            Constants.changeCompliancyWithW3C(false);

            expect(Constants.STYLES).toBe(styles);
            expect(Constants.HANDLERS).toBe(handlers);
            expect(Constants.EXPRESSIONS).toBe(expressions);
        });

        it('should rebuild STYLES and HANDLERS, but not EXPRESSIONS, on a mode switch', () => {
            const styles = Constants.STYLES, handlers = Constants.HANDLERS, expressions = Constants.EXPRESSIONS;

            Constants.changeCompliancyWithW3C(true);

            expect(Constants.STYLES).not.toBe(styles);
            expect(Constants.HANDLERS).not.toBe(handlers);
            expect(Constants.EXPRESSIONS).toBe(expressions);
        });

        it('should leave a reference taken before the switch on the old names', () => {
            const before = Constants.HANDLERS;

            Constants.changeCompliancyWithW3C(true);

            expect(before.VALUE_HANDLER_ATTRIBUTE_NAME).toBe('nb-value');
            expect(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME).toBe('data-nb-value');
        });

        it('should restore the default names after switching back', () => {
            Constants.changeCompliancyWithW3C(true);
            Constants.changeCompliancyWithW3C(false);

            expect(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME).toBe('nb-value');
            expect(Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR).toContain('nb-event:');
            expect(Constants.STYLES.DEFAULT_HIDE_CLASS_NAME).toBe('nb-hidden');
        });
    });

    describe('full handler names in W3C mode', () => {
        it.each([
            ['VALUE_HANDLER_ATTRIBUTE_NAME', 'data-nb-value'],
            ['REPEAT_HANDLER_ATTRIBUTE_NAME', 'data-nb-repeat'],
            ['EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME', 'data-nb-event'],
            ['ASPECT_HANDLER_PREFIX_NAME', 'data-nb-aspect'],
            ['IN_HANDLER_ATTRIBUTE_NAME', 'data-nb-in'],
            ['IN_REF_HANDLER_ATTRIBUTE_NAME', 'data-nb-in-ref'],
            ['COMPONENT_MARKER_ATTRIBUTE_NAME', 'data-nb-component'],
            ['ENCAPSULATED_MARKER_ATTRIBUTE_NAME', 'data-nb-encapsulated'],
        ] as const)('%s → %s', (key, expected) => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.HANDLERS[key]).toBe(expected);
        });

        it('should join prefix handlers and their meta value with the W3C separator', () => {
            Constants.changeCompliancyWithW3C(true);

            expect(Constants.HANDLERS.KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR).toContain('data-nb-event--');
            expect(Constants.HANDLERS.KNOWN_HANDLER_PREFIX_EXTENSIONS_WITH_META_SEPARATOR).toEqual(['data-nb-in--', 'data-nb-in-ref--']);
        });
    });

    describe('getReadyAttributeName', () => {
        it('should append the ready suffix with a single dash', () => {
            expect(Constants.HANDLERS.getReadyAttributeName(Constants.HANDLERS.IF_HANDLER_ATTRIBUTE_NAME)).toBe('nb-if-ready');
            expect(Constants.HANDLERS.getReadyAttributeName(Constants.HANDLERS.COMPONENT_MARKER_ATTRIBUTE_NAME)).toBe('nb-component-ready');
        });

        it('should follow the W3C prefix', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.HANDLERS.getReadyAttributeName(Constants.HANDLERS.REPEAT_HANDLER_ATTRIBUTE_NAME)).toBe('data-nb-repeat-ready');
        });

        it('should produce exactly the attribute the processing-hide selectors wait for', () => {
            for (const name of [Constants.HANDLERS.IF_HANDLER_ATTRIBUTE_NAME, Constants.HANDLERS.SWITCH_HANDLER_ATTRIBUTE_NAME,
                                Constants.HANDLERS.REPEAT_HANDLER_ATTRIBUTE_NAME, Constants.HANDLERS.TEMPLATE_HANDLER_ATTRIBUTE_NAME,
                                Constants.HANDLERS.CONTAINER_HANDLER_ATTRIBUTE_NAME, Constants.HANDLERS.COMPONENT_MARKER_ATTRIBUTE_NAME]) {
                expect(Constants.STYLES.DEFAULT_PROCESSING_HIDE_STYLE)
                    .toContain(`[${name}]:not([${Constants.HANDLERS.getReadyAttributeName(name)}])`);
            }
        });
    });

    describe('handler attribute names', () => {
        it('should have VALUE_HANDLER_ATTRIBUTE_NAME as "nb-value"', () => {
            expect(Constants.HANDLERS.VALUE_HANDLER_ATTRIBUTE_NAME).toBe('nb-value');
        });

        it('should have HTML_HANDLER_ATTRIBUTE_NAME as "nb-html"', () => {
            expect(Constants.HANDLERS.HTML_HANDLER_ATTRIBUTE_NAME).toBe('nb-html');
        });

        it('should have CLASS_HANDLER_ATTRIBUTE_NAME as "nb-class"', () => {
            expect(Constants.HANDLERS.CLASS_HANDLER_ATTRIBUTE_NAME).toBe('nb-class');
        });

        it('should have STYLE_HANDLER_ATTRIBUTE_NAME as "nb-style"', () => {
            expect(Constants.HANDLERS.STYLE_HANDLER_ATTRIBUTE_NAME).toBe('nb-style');
        });

        it('should have IF_HANDLER_ATTRIBUTE_NAME as "nb-if"', () => {
            expect(Constants.HANDLERS.IF_HANDLER_ATTRIBUTE_NAME).toBe('nb-if');
        });

        it('should have REPEAT_HANDLER_ATTRIBUTE_NAME as "nb-repeat"', () => {
            expect(Constants.HANDLERS.REPEAT_HANDLER_ATTRIBUTE_NAME).toBe('nb-repeat');
        });

        it('should have EXEC_HANDLER_ATTRIBUTE_NAME as "nb-exec"', () => {
            expect(Constants.HANDLERS.EXEC_HANDLER_ATTRIBUTE_NAME).toBe('nb-exec');
        });

        it('should have SWITCH_HANDLER_ATTRIBUTE_NAME as "nb-switch"', () => {
            expect(Constants.HANDLERS.SWITCH_HANDLER_ATTRIBUTE_NAME).toBe('nb-switch');
        });

        it('should have CONTAINER_HANDLER_ATTRIBUTE_NAME as "nb-container"', () => {
            expect(Constants.HANDLERS.CONTAINER_HANDLER_ATTRIBUTE_NAME).toBe('nb-container');
        });

        it('should have COMPONENT_MARKER_ATTRIBUTE_NAME as "nb-component"', () => {
            expect(Constants.HANDLERS.COMPONENT_MARKER_ATTRIBUTE_NAME).toBe('nb-component');
        });

        it('should have TEMPLATE_HANDLER_ATTRIBUTE_NAME as "nb-template"', () => {
            expect(Constants.HANDLERS.TEMPLATE_HANDLER_ATTRIBUTE_NAME).toBe('nb-template');
        });

        it('should have BOUND_HANDLER_ATTRIBUTE_NAME as "nb-bound"', () => {
            expect(Constants.HANDLERS.BOUND_HANDLER_ATTRIBUTE_NAME).toBe('nb-bound');
        });
    });

    describe('prefix handler names', () => {
        it('should have PROPERTY_HANDLER_ATTRIBUTE_NAME as "nb-prop"', () => {
            expect(Constants.HANDLERS.PROPERTY_HANDLER_ATTRIBUTE_NAME).toBe('nb-prop');
        });

        it('should have ATTRIBUTE_HANDLER_ATTRIBUTE_NAME as "nb-attr"', () => {
            expect(Constants.HANDLERS.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME).toBe('nb-attr');
        });

        it('should have EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME as "nb-event"', () => {
            expect(Constants.HANDLERS.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME).toBe('nb-event');
        });

        it('should have VARIABLE_HANDLER_PREFIX_NAME as "nb-var"', () => {
            expect(Constants.HANDLERS.VARIABLE_HANDLER_PREFIX_NAME).toBe('nb-var');
        });
    });

    describe('execution param names', () => {
        it('should have INDEX_EXECUTION_PARAM_NAME as "index"', () => {
            expect(Constants.EXPRESSIONS.INDEX_EXECUTION_PARAM_NAME).toBe('index');
        });

        it('should have ITEM_EXECUTION_PARAM_NAME as "item"', () => {
            expect(Constants.EXPRESSIONS.ITEM_EXECUTION_PARAM_NAME).toBe('item');
        });

        it('should have TOTAL_COUNT_EXECUTION_PARAM_NAME as "count"', () => {
            expect(Constants.EXPRESSIONS.TOTAL_COUNT_EXECUTION_PARAM_NAME).toBe('count');
        });

        it('should have EVENT_EXECUTION_PARAM_NAME as "event"', () => {
            expect(Constants.EXPRESSIONS.EVENT_EXECUTION_PARAM_NAME).toBe('event');
        });

        it('should have NATIVE_ELEMENT_EXECUTION_PARAM_NAME as "nativeElement"', () => {
            expect(Constants.EXPRESSIONS.NATIVE_ELEMENT_EXECUTION_PARAM_NAME).toBe('nativeElement');
        });

        it('should have ELEMENT_EXECUTION_PARAM_NAME as "element"', () => {
            expect(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_NAME).toBe('element');
        });

        it('should have UNSUBSCRIBE_EXECUTION_PARAM_NAME as "unSubscribe"', () => {
            expect(Constants.EXPRESSIONS.UNSUBSCRIBE_EXECUTION_PARAM_NAME).toBe('unSubscribe');
        });

        it('should have ROUTER_EXECUTION_PARAM_NAME as "router"', () => {
            expect(Constants.EXPRESSIONS.ROUTER_EXECUTION_PARAM_NAME).toBe('router');
        });

        it('should have DATA_EXECUTION_PARAM_NAME as "data"', () => {
            expect(Constants.EXPRESSIONS.DATA_EXECUTION_PARAM_NAME).toBe('data');
        });
    });

    describe('binding prefixes', () => {
        it('should have "#" as SINGLE_BIND_PREFIX_CHAR', () => {
            expect(Constants.EXPRESSIONS.SINGLE_BIND_PREFIX_CHAR).toBe('#');
        });

        it('should have "@" as CONSTANT_BIND_PREFIX_CHAR', () => {
            expect(Constants.EXPRESSIONS.CONSTANT_BIND_PREFIX_CHAR).toBe('@');
        });
    });

    describe('KNOWN_HANDLERS', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(Constants.HANDLERS.KNOWN_HANDLERS)).toBe(true);
            expect(Constants.HANDLERS.KNOWN_HANDLERS.length).toBeGreaterThan(0);
        });

        it('should include nb-value by default', () => {
            expect(Constants.HANDLERS.KNOWN_HANDLERS).toContain('nb-value');
        });

        it('should include nb-if by default', () => {
            expect(Constants.HANDLERS.KNOWN_HANDLERS).toContain('nb-if');
        });

        it('should update when W3C mode changes', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.HANDLERS.KNOWN_HANDLERS).toContain('data-nb-value');
            expect(Constants.HANDLERS.KNOWN_HANDLERS).not.toContain('nb-value');
        });
    });

    describe('KNOWN_PREFIX_HANDLERS', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(Constants.HANDLERS.KNOWN_PREFIX_HANDLERS)).toBe(true);
            expect(Constants.HANDLERS.KNOWN_PREFIX_HANDLERS.length).toBeGreaterThan(0);
        });

        it('should include nb-repeat by default', () => {
            expect(Constants.HANDLERS.KNOWN_PREFIX_HANDLERS).toContain('nb-repeat');
        });

        it('should include nb-event by default', () => {
            expect(Constants.HANDLERS.KNOWN_PREFIX_HANDLERS).toContain('nb-event');
        });
    });

    describe('DEFAULT_HIDE_CLASS_NAME', () => {
        it('should be "nb-hidden" in default mode', () => {
            expect(Constants.STYLES.DEFAULT_HIDE_CLASS_NAME).toBe('nb-hidden');
        });

        it('should be "data-nb-hidden" in W3C mode', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.STYLES.DEFAULT_HIDE_CLASS_NAME).toBe('data-nb-hidden');
        });
    });

    describe('DEFAULT_HIDE_STYLE', () => {
        // the hide stylesheet is built once during Environment static init - necessarily before
        // config({complyWithW3C: true}) can run - so its rule must target the hide class in BOTH modes
        function hideStyleSelectors(): Array<string> {
            return Constants.STYLES.DEFAULT_HIDE_STYLE
                            .slice(0, Constants.STYLES.DEFAULT_HIDE_STYLE.indexOf('{'))
                            .split(',')
                            .map(selector => selector.trim())
                            .filter(selector => selector.length > 0);
        }

        it('should contain the hide class name', () => {
            expect(Constants.STYLES.DEFAULT_HIDE_STYLE).toContain('nb-hidden');
        });

        it('should contain display: none', () => {
            expect(Constants.STYLES.DEFAULT_HIDE_STYLE).toContain('display: none !important');
        });

        it('should target the hide class name in default mode', () => {
            expect(hideStyleSelectors()).toContain(`.${Constants.STYLES.DEFAULT_HIDE_CLASS_NAME}`);
        });

        it('should target the hide class name in W3C mode', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(hideStyleSelectors()).toContain(`.${Constants.STYLES.DEFAULT_HIDE_CLASS_NAME}`);
        });

        it('should match an element hidden in W3C mode even though the stylesheet predates the mode switch', () => {
            // capture the style exactly as it is built at static-init time (default mode), then flip the mode
            const styleBuiltBeforeModeSwitch = Constants.STYLES.DEFAULT_HIDE_STYLE;
            Constants.changeCompliancyWithW3C(true);

            const el = document.createElement('div');
            el.classList.add(Constants.STYLES.DEFAULT_HIDE_CLASS_NAME);

            const selectors = styleBuiltBeforeModeSwitch
                                    .slice(0, styleBuiltBeforeModeSwitch.indexOf('{'))
                                    .split(',')
                                    .map(selector => selector.trim())
                                    .filter(selector => selector.length > 0);

            expect(selectors.some(selector => el.matches(selector))).toBe(true);
        });
    });

    describe('DEFAULT_PROCESSING_HIDE_STYLE', () => {
        it('should contain nb-template', () => {
            expect(Constants.STYLES.DEFAULT_PROCESSING_HIDE_STYLE).toContain('nb-template');
        });

        it('should contain display: none', () => {
            expect(Constants.STYLES.DEFAULT_PROCESSING_HIDE_STYLE).toContain('display: none');
        });

        // R6-3: the rules used to be wrapped in `* { … }` and relied on native CSS Nesting,
        // so a parser without nesting support dropped the whole sheet and the desugared
        // `* [nb-if]…` form never matched a top-level element of a shadow root.
        it('should parse into flat rules in a parser without CSS-nesting support (R6-3)', () => {
            const style = document.createElement('style');
            style.textContent = Constants.STYLES.DEFAULT_PROCESSING_HIDE_STYLE;
            document.head.appendChild(style);

            try {
                expect(style.sheet).not.toBeNull();

                const rules = Array.from(style.sheet!.cssRules) as CSSStyleRule[];
                expect(rules.length).toBe(2);
                for (const rule of rules) {
                    expect(rule.selectorText).toContain('[nb-');
                    expect(rule.style.getPropertyValue('display')).toBe('none');
                }
            } finally {
                style.remove();
            }
        });

        it('should hide a top-level element of a shadow root until it is marked ready (R6-3)', () => {
            const families = ['template', 'if', 'container', 'component', 'repeat', 'switch'];

            for (const family of families) {
                for (const prefix of ['nb', 'data-nb']) {
                    const attributeName = `${prefix}-${family}`;
                    const readyAttributeName = Constants.HANDLERS.getReadyAttributeName(attributeName);
                    const selector = `[${attributeName}]:not([${readyAttributeName}])`;

                    expect(Constants.STYLES.DEFAULT_PROCESSING_HIDE_STYLE).toContain(selector);

                    // a direct child of a ShadowRoot has no element ancestor inside its own tree
                    const host = document.createElement('div');
                    document.body.appendChild(host);
                    const shadowRoot = host.attachShadow({ mode: 'open' });
                    const topLevel = document.createElement('div');
                    topLevel.setAttribute(attributeName, 'expression');
                    shadowRoot.appendChild(topLevel);

                    try {
                        expect(topLevel.matches(selector)).toBe(true);

                        topLevel.setAttribute(readyAttributeName, '');
                        expect(topLevel.matches(selector)).toBe(false);
                    } finally {
                        host.remove();
                    }
                }
            }
        });
    });

    describe('changeCompliancyWithW3C', () => {
        it('should not re-apply when setting same value', () => {
            // Default is false, setting to false should be no-op
            const currentPrefix = Constants.PREFIX;
            Constants.changeCompliancyWithW3C(false);
            expect(Constants.PREFIX).toBe(currentPrefix);
        });

        it('should toggle between modes', () => {
            expect(Constants.PREFIX).toBe('nb');

            Constants.changeCompliancyWithW3C(true);
            expect(Constants.PREFIX).toBe('data-nb');

            Constants.changeCompliancyWithW3C(false);
            expect(Constants.PREFIX).toBe('nb');
        });
    });

    describe('KNOWN_HANDLERS_SET', () => {
        it('should be a Set', () => {
            expect(Constants.HANDLERS.KNOWN_HANDLERS_SET).toBeInstanceOf(Set);
        });

        it('should contain known handler names', () => {
            expect(Constants.HANDLERS.KNOWN_HANDLERS_SET.has('nb-value')).toBe(true);
            expect(Constants.HANDLERS.KNOWN_HANDLERS_SET.has('nb-if')).toBe(true);
        });

        it('should update when W3C mode changes', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.HANDLERS.KNOWN_HANDLERS_SET.has('data-nb-value')).toBe(true);
            expect(Constants.HANDLERS.KNOWN_HANDLERS_SET.has('nb-value')).toBe(false);
        });
    });

    describe('KNOWN_HANDLERS_WITHOUT_VALUE', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(Constants.HANDLERS.KNOWN_HANDLERS_WITHOUT_VALUE)).toBe(true);
            expect(Constants.HANDLERS.KNOWN_HANDLERS_WITHOUT_VALUE.length).toBeGreaterThan(0);
        });

        it('should not contain nb-value among its items', () => {
            // This array excludes the value handler
            const hasValueHandler = Constants.HANDLERS.KNOWN_HANDLERS_WITHOUT_VALUE
                .some(h => h === 'nb-value' || h === 'data-nb-value');
            expect(hasValueHandler).toBe(false);
        });
    });

    describe('KNOWN_HANDLER_EXTENSIONS', () => {
        it('should be a non-empty Set', () => {
            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS).toBeInstanceOf(Set);
            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.size).toBeGreaterThan(0);
        });

        it('should contain nb-projection by default', () => {
            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.has('nb-projection')).toBe(true);
        });

        it('should update when W3C mode changes', () => {
            Constants.changeCompliancyWithW3C(true);
            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.has('data-nb-projection')).toBe(true);
        });
    });

    describe('HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX', () => {
        it('should be "-ready" in both modes (the dash is part of the suffix)', () => {
            expect(Constants.HANDLERS.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX).toBe('-ready');

            Constants.changeCompliancyWithW3C(true);
            expect(Constants.HANDLERS.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX).toBe('-ready');
        });
    });

    describe('RESERVED_CONTEXT_NAMES', () => {
        it('should be a Set', () => {
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES).toBeInstanceOf(Set);
        });

        it('should contain repeat execution param names', () => {
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.ITEM_EXECUTION_PARAM_NAME)).toBe(true);
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.INDEX_EXECUTION_PARAM_NAME)).toBe(true);
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.TOTAL_COUNT_EXECUTION_PARAM_NAME)).toBe(true);
        });

        it('should contain event execution param names (lowercased)', () => {
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.EVENT_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.DATA_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.ROUTER_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.UNSUBSCRIBE_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
        });

        it('should contain element-binding execution param names (lowercased)', () => {
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.NATIVE_ELEMENT_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_NAME.toLowerCase())).toBe(true);
        });

        it('should store all reserved names in lowercase form (M-12 fix)', () => {
            for (const name of Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES) {
                expect(name).toBe(name.toLowerCase());
            }
        });

        it('should not contain unrelated names', () => {
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has('foo')).toBe(false);
            expect(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES.has('myValue')).toBe(false);
        });

        it('should be immutable (frozen)', () => {
            expect(Object.isFrozen(Constants.EXPRESSIONS.RESERVED_CONTEXT_NAMES)).toBe(true);
        });
    });

    describe('readonly collection invariants', () => {
        it('KNOWN_HANDLERS should be frozen', () => {
            expect(Object.isFrozen(Constants.HANDLERS.KNOWN_HANDLERS)).toBe(true);
        });

        it('KNOWN_HANDLERS_SET should be frozen', () => {
            expect(Object.isFrozen(Constants.HANDLERS.KNOWN_HANDLERS_SET)).toBe(true);
        });

        it('KNOWN_PREFIX_HANDLERS should be frozen', () => {
            expect(Object.isFrozen(Constants.HANDLERS.KNOWN_PREFIX_HANDLERS)).toBe(true);
        });

        it('KNOWN_HANDLERS_WITHOUT_VALUE should be frozen', () => {
            expect(Object.isFrozen(Constants.HANDLERS.KNOWN_HANDLERS_WITHOUT_VALUE)).toBe(true);
        });

        it('KNOWN_HANDLER_EXTENSIONS should be frozen', () => {
            expect(Object.isFrozen(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS)).toBe(true);
        });

        it('KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES should be frozen', () => {
            expect(Object.isFrozen(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES)).toBe(true);
        });
    });

    describe('additional handler attribute names', () => {
        it('should have IN_HANDLER_ATTRIBUTE_NAME defined', () => {
            expect(Constants.HANDLERS.IN_HANDLER_ATTRIBUTE_NAME).toBeDefined();
        });

        it('should have SWITCH_CASE_HANDLER_ATTRIBUTE_NAME defined', () => {
            expect(Constants.HANDLERS.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME).toBeDefined();
        });

        it('should have SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME defined', () => {
            expect(Constants.HANDLERS.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME).toBeDefined();
        });

        it('should have ASPECT_HANDLER_PREFIX_NAME defined', () => {
            expect(Constants.HANDLERS.ASPECT_HANDLER_PREFIX_NAME).toBeDefined();
        });

        it('should have PROJECTION_ATTRIBUTE_NAME as "nb-projection"', () => {
            expect(Constants.HANDLERS.PROJECTION_ATTRIBUTE_NAME).toBe('nb-projection');
        });
    });

    describe('projection attribute names', () => {
        afterEach(() => {
            Constants.changeCompliancyWithW3C(false);
        });

        it('should expose the full projection / encapsulated / project-to / project-instead names', () => {
            expect(Constants.HANDLERS.PROJECTION_ATTRIBUTE_NAME).toBe('nb-projection');
            expect(Constants.HANDLERS.ENCAPSULATED_MARKER_ATTRIBUTE_NAME).toBe('nb-encapsulated');
            expect(Constants.HANDLERS.PROJECT_TO_ATTRIBUTE_NAME).toBe('nb-project-to');
            expect(Constants.HANDLERS.PROJECT_INSTEAD_ATTRIBUTE_NAME).toBe('nb-project-instead');
        });

        it('should recompute every full projection name in W3C mode', () => {
            Constants.changeCompliancyWithW3C(true);

            expect(Constants.HANDLERS.PROJECTION_ATTRIBUTE_NAME).toBe('data-nb-projection');
            expect(Constants.HANDLERS.ENCAPSULATED_MARKER_ATTRIBUTE_NAME).toBe('data-nb-encapsulated');
            expect(Constants.HANDLERS.PROJECT_TO_ATTRIBUTE_NAME).toBe('data-nb-project-to');
            expect(Constants.HANDLERS.PROJECT_INSTEAD_ATTRIBUTE_NAME).toBe('data-nb-project-instead');
        });

        it('should register the encapsulated marker as a system attribute (both sets)', () => {
            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.has('nb-encapsulated')).toBe(true);
            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES.has('nb-encapsulated')).toBe(true);

            Constants.changeCompliancyWithW3C(true);

            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS.has('data-nb-encapsulated')).toBe(true);
            expect(Constants.HANDLERS.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES.has('data-nb-encapsulated')).toBe(true);
        });

        it('should not hide projected content in the processing-hide style', () => {
            expect(Constants.STYLES.DEFAULT_PROCESSING_HIDE_STYLE).not.toContain('[nb-projection]');
            expect(Constants.STYLES.DEFAULT_PROCESSING_HIDE_STYLE).not.toContain('[data-nb-projection]');
        });
    });

    // Decides whether an nb-event / nb-bound expression can reach the ElementManipulations proxy, i.e. whether
    // it references the injected `element` param as a standalone identifier. A false positive only keeps the
    // manipulation handlers alive (the old behaviour); a false negative would drop manipulations — so every
    // doubtful case errs towards a match.
    describe('ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP', () => {
        const references = (expression: string) => Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP.test(expression);

        it('should be built from ELEMENT_EXECUTION_PARAM_NAME', () => {
            expect(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP.source).toContain(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_NAME);
        });

        it('should not be global or sticky — test() must not carry lastIndex between calls on the shared instance', () => {
            expect(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP.global).toBe(false);
            expect(Constants.EXPRESSIONS.ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP.sticky).toBe(false);

            // the same input twice in a row gives the same answer
            expect(references('element.classes.add("x")')).toBe(true);
            expect(references('element.classes.add("x")')).toBe(true);
        });

        it.each([
            'element',
            'element.classes.add("x")',
            'element?.styles.set("color", "red")',
            'element["classes"].add("x")',
            'this.select(element)',
            'this.select(item, element)',
            'this.select(element, item)',
            'this.ref = element',
            '!element',
            'cond ? element : null',
            '`${element}`',
            '({element})',
            'typeof element',
            '(element)',
            'x => element',
            'this.a(); element.classes.add("x")',
            'this.a()\nelement.classes.add("x")',
        ])('should match the standalone identifier: %s', (expression) => {
            expect(references(expression)).toBe(true);
        });

        it.each([
            '',
            'this.select(item)',
            'elementForFun',
            'this.elementForFun()',
            'myElement',
            'myelement',
            'this.myelement',
            'my_element',
            '_element',
            'element_',
            '$element',
            'element$',
            'element2',
            'Element',
            'ELEMENT',
            'nativeElement',
            'nativeElement.focus()',
            'this.element',
            'this?.element',
            'this.#element',
            'this.items.element.id',
        ])('should not match a longer identifier or a member access: %s', (expression) => {
            expect(references(expression)).toBe(false);
        });

        it.each([
            ['a string literal', '"element"'],
            ['an object key', '{ element: 1 }'],
            ['a local parameter shadowing the param', 'items.map(element => element.id)'],
            ['a member access with a space after the dot', 'this. element'],
        ])('should accept the harmless false positive of %s', (_label, expression) => {
            expect(references(expression)).toBe(true);
        });
    });
});
