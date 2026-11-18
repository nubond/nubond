
class StylesConstants {
    public readonly DEFAULT_HIDE_CLASS_NAME: string;

    public readonly DEFAULT_HIDE_STYLE = `
.nb-hidden, .data-nb-hidden { 
    display: none !important;
}`;

    public readonly DEFAULT_PROCESSING_HIDE_STYLE = `
[nb-switch]:not([nb-switch-ready]), [data-nb-switch]:not([data-nb-switch-ready]),
[nb-if]:not([nb-if-ready]), [data-nb-if]:not([data-nb-if-ready]) { 
    display: none !important; 
}

[nb-repeat]:not([nb-repeat-ready]), [data-nb-repeat]:not([data-nb-repeat-ready]),
[nb-template]:not([nb-template-ready]), [data-nb-template]:not([data-nb-template-ready]),
[nb-container]:not([nb-container-ready]), [data-nb-container]:not([data-nb-container-ready]),
[nb-component]:not([nb-component-ready]), [data-nb-component]:not([data-nb-component-ready]) {
    display: none; 
}`;

    constructor(prefix: string) {
        this.DEFAULT_HIDE_CLASS_NAME = `${prefix}-hidden`;
    }
}

class ExpressionsConstants {
    public readonly SINGLE_BIND_PREFIX_CHAR = '#';
    public readonly CONSTANT_BIND_PREFIX_CHAR = '@';

    //in repeat
    public readonly INDEX_EXECUTION_PARAM_NAME = 'index'; //current loop index, used only in nb-repeat
    public readonly ITEM_EXECUTION_PARAM_NAME = 'item'; //current loop time, used only in nb-repeat
    public readonly TOTAL_COUNT_EXECUTION_PARAM_NAME = 'count'; //current loop total count, used only in nb-repeat
    //in event
    public readonly EVENT_EXECUTION_PARAM_NAME = 'event'; //link to event wrapper, used only in nb-event
    public readonly DATA_EXECUTION_PARAM_NAME = 'data'; //link to custom event data
    public readonly ROUTER_EXECUTION_PARAM_NAME = 'router'; //link to event wrapper, used only in nb-event
    public readonly UNSUBSCRIBE_EXECUTION_PARAM_NAME = 'unSubscribe'; //unsubscribe from event, used only in nb-event
    
    //in event and in binded
    public readonly NATIVE_ELEMENT_EXECUTION_PARAM_NAME = 'nativeElement'; //link to native element
    public readonly ELEMENT_EXECUTION_PARAM_NAME = 'element'; //link to ElementManipulations

    public readonly ELEMENT_EXECUTION_PARAM_REFERENCE_REGEXP = new RegExp(`(?<![\\w$.#])${this.ELEMENT_EXECUTION_PARAM_NAME}(?![\\w$])`);

    public readonly RESERVED_CONTEXT_NAMES: ReadonlySet<string> = Object.freeze(new Set([
        //repeat
        this.INDEX_EXECUTION_PARAM_NAME, this.ITEM_EXECUTION_PARAM_NAME, this.TOTAL_COUNT_EXECUTION_PARAM_NAME,

        //events
        this.EVENT_EXECUTION_PARAM_NAME, this.DATA_EXECUTION_PARAM_NAME, this.ROUTER_EXECUTION_PARAM_NAME,
        this.UNSUBSCRIBE_EXECUTION_PARAM_NAME,

        //in event and in binded
        this.NATIVE_ELEMENT_EXECUTION_PARAM_NAME, this.ELEMENT_EXECUTION_PARAM_NAME
    ].map(el => el.toLowerCase())));
}

class HandlersConstants {
    //regular handlers
    public readonly VALUE_HANDLER_ATTRIBUTE_NAME: string;           //bind data to element textContent
    public readonly HTML_HANDLER_ATTRIBUTE_NAME: string;            //bind data to element innerHTML
    public readonly CLASS_HANDLER_ATTRIBUTE_NAME: string;           //bind data to classes
    public readonly STYLE_HANDLER_ATTRIBUTE_NAME: string;           //bind data to element style
    public readonly IF_HANDLER_ATTRIBUTE_NAME: string;              //if expression is true, element will be shown, if false, hidden class from hiddenClassName will be added
    public readonly REPEAT_HANDLER_ATTRIBUTE_NAME: string;          //repeat current element in loop, first element in repeat sequences is treated as repeat template.
    public readonly EXEC_HANDLER_ATTRIBUTE_NAME: string;            //execute expression
    public readonly SWITCH_HANDLER_ATTRIBUTE_NAME: string;          //switch
    public readonly SWITCH_CASE_HANDLER_ATTRIBUTE_NAME: string;     //case
    public readonly SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME: string;  //default
    public readonly TEMPLATE_HANDLER_ATTRIBUTE_NAME: string;        //template
    public readonly BOUND_HANDLER_ATTRIBUTE_NAME: string;           //bound

    //regular handlers with contexts
    public readonly CONTAINER_HANDLER_ATTRIBUTE_NAME: string;       //container binding
    public readonly ASPECT_HANDLER_PREFIX_NAME: string;             //aspect binding

    //prefix handlers
    public readonly PROPERTY_HANDLER_ATTRIBUTE_NAME: string;;       //bind data to prop
    public readonly ATTRIBUTE_HANDLER_ATTRIBUTE_NAME: string;       //bind data to attr
    public readonly EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME: string;    //bind to event
    public readonly VARIABLE_HANDLER_PREFIX_NAME: string;           //bind to variable
    public readonly IN_HANDLER_ATTRIBUTE_NAME: string;              //bind data to component or container input
    public readonly IN_REF_HANDLER_ATTRIBUTE_NAME: string;          //bind data to component or container input

    //projection
    public readonly PROJECTION_ATTRIBUTE_NAME: string;              //projection
    public readonly PROJECT_TO_ATTRIBUTE_NAME: string;              //projection to element
    public readonly PROJECT_INSTEAD_ATTRIBUTE_NAME: string;         //projection instead of this element

    //markers
    public readonly ENCAPSULATED_MARKER_ATTRIBUTE_NAME: string;            //encapsulated projection
    public readonly COMPONENT_MARKER_ATTRIBUTE_NAME: string;        //nb component
    public readonly HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX: string;         //mark needed element as ready

    //known handlers collections
    //simple handlers, like nb-value="this.value"
    public readonly KNOWN_HANDLERS: Readonly<Array<string>>;
    public readonly KNOWN_HANDLERS_SET: ReadonlySet<string>;
    public readonly KNOWN_HANDLERS_WITHOUT_VALUE: Readonly<Array<string>>;

    //prefix handlers, like nb-event:click="this.click()"
    public readonly KNOWN_PREFIX_HANDLERS: Readonly<Array<string>>;    
    public readonly KNOWN_PREFIX_HANDLERS_WITH_OPTIONAL_META: ReadonlySet<string>;
    public readonly KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR: Readonly<Array<string>>;

    //Handler extensions, like nb-in:test="this.test"
    public readonly KNOWN_HANDLER_EXTENSIONS: ReadonlySet<string>;
    public readonly KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES: ReadonlySet<string>;

    public readonly KNOWN_HANDLER_PREFIX_EXTENSIONS: Readonly<Array<string>>;
    public readonly KNOWN_HANDLER_PREFIX_EXTENSIONS_WITH_META_SEPARATOR: Readonly<Array<string>>;

    constructor(prefix: string, metaValueSeparator: string) {
        //regular handlers
        this.VALUE_HANDLER_ATTRIBUTE_NAME           = `${prefix}-value`;
        this.HTML_HANDLER_ATTRIBUTE_NAME            = `${prefix}-html`;
        this.CLASS_HANDLER_ATTRIBUTE_NAME           = `${prefix}-class`;
        this.STYLE_HANDLER_ATTRIBUTE_NAME           = `${prefix}-style`;
        this.IF_HANDLER_ATTRIBUTE_NAME              = `${prefix}-if`;
        this.REPEAT_HANDLER_ATTRIBUTE_NAME          = `${prefix}-repeat`;
        this.EXEC_HANDLER_ATTRIBUTE_NAME            = `${prefix}-exec`;
        this.SWITCH_HANDLER_ATTRIBUTE_NAME          = `${prefix}-switch`;
        this.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME     = `${prefix}-case`;
        this.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME  = `${prefix}-default`;
        this.TEMPLATE_HANDLER_ATTRIBUTE_NAME        = `${prefix}-template`;
        this.BOUND_HANDLER_ATTRIBUTE_NAME           = `${prefix}-bound`;

        //regular handlers with contexts
        this.CONTAINER_HANDLER_ATTRIBUTE_NAME       = `${prefix}-container`;
        this.ASPECT_HANDLER_PREFIX_NAME             = `${prefix}-aspect`;

        //prefix handlers
        this.PROPERTY_HANDLER_ATTRIBUTE_NAME        = `${prefix}-prop`;
        this.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME       = `${prefix}-attr`;
        this.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME    = `${prefix}-event`;
        this.VARIABLE_HANDLER_PREFIX_NAME           = `${prefix}-var`;
        this.IN_HANDLER_ATTRIBUTE_NAME              = `${prefix}-in`;
        this.IN_REF_HANDLER_ATTRIBUTE_NAME          = `${prefix}-in-ref`;

        //projection
        this.PROJECTION_ATTRIBUTE_NAME              = `${prefix}-projection`;
        this.PROJECT_TO_ATTRIBUTE_NAME              = `${prefix}-project-to`;
        this.PROJECT_INSTEAD_ATTRIBUTE_NAME         = `${prefix}-project-instead`;

        //markers
        this.ENCAPSULATED_MARKER_ATTRIBUTE_NAME     = `${prefix}-encapsulated`;
        this.COMPONENT_MARKER_ATTRIBUTE_NAME        = `${prefix}-component`;
        this.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX  = '-ready';

        //known handlers collections
        this.KNOWN_HANDLERS = Object.freeze([
            this.VALUE_HANDLER_ATTRIBUTE_NAME,
            this.HTML_HANDLER_ATTRIBUTE_NAME,
            this.CLASS_HANDLER_ATTRIBUTE_NAME,
            this.STYLE_HANDLER_ATTRIBUTE_NAME,
            this.IF_HANDLER_ATTRIBUTE_NAME,
            this.CONTAINER_HANDLER_ATTRIBUTE_NAME,
            this.EXEC_HANDLER_ATTRIBUTE_NAME,
            this.SWITCH_HANDLER_ATTRIBUTE_NAME,
            this.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME,
            this.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME,
            this.TEMPLATE_HANDLER_ATTRIBUTE_NAME,
            this.BOUND_HANDLER_ATTRIBUTE_NAME
        ]);
        this.KNOWN_HANDLERS_SET = Object.freeze(new Set(this.KNOWN_HANDLERS));
        this.KNOWN_HANDLERS_WITHOUT_VALUE = Object.freeze([
            this.ASPECT_HANDLER_PREFIX_NAME,
            this.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME
        ]);

        this.KNOWN_PREFIX_HANDLERS = Object.freeze([
            this.REPEAT_HANDLER_ATTRIBUTE_NAME,
            this.PROPERTY_HANDLER_ATTRIBUTE_NAME, 
            this.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME, 
            this.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME,
            this.ASPECT_HANDLER_PREFIX_NAME,
            this.VARIABLE_HANDLER_PREFIX_NAME
        ]);
        this.KNOWN_PREFIX_HANDLERS_WITH_OPTIONAL_META = Object.freeze(new Set([
            this.REPEAT_HANDLER_ATTRIBUTE_NAME
        ]));
        this.KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR = Object.freeze(this.KNOWN_PREFIX_HANDLERS.map(el => el + metaValueSeparator));

        this.KNOWN_HANDLER_EXTENSIONS = Object.freeze(new Set([
            this.PROJECTION_ATTRIBUTE_NAME,
            this.PROJECT_TO_ATTRIBUTE_NAME, 
            this.PROJECT_INSTEAD_ATTRIBUTE_NAME,

            this.ENCAPSULATED_MARKER_ATTRIBUTE_NAME
        ]));
        this.KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES = Object.freeze(new Set([ 
            this.PROJECTION_ATTRIBUTE_NAME,
            this.PROJECT_TO_ATTRIBUTE_NAME, 
            this.PROJECT_INSTEAD_ATTRIBUTE_NAME,

            this.ENCAPSULATED_MARKER_ATTRIBUTE_NAME,
            this.COMPONENT_MARKER_ATTRIBUTE_NAME
        ]));

        this.KNOWN_HANDLER_PREFIX_EXTENSIONS = Object.freeze([
            this.IN_HANDLER_ATTRIBUTE_NAME,
            this.IN_REF_HANDLER_ATTRIBUTE_NAME
        ]);
        this.KNOWN_HANDLER_PREFIX_EXTENSIONS_WITH_META_SEPARATOR = Object.freeze(this.KNOWN_HANDLER_PREFIX_EXTENSIONS.map(el => el + metaValueSeparator));
    }

    public getReadyAttributeName(fullHandlerAttributeName: string): string {
        return `${fullHandlerAttributeName}${this.HANDLER_READY_MARKER_ATTRIBUTE_SUFFIX}`
    }
}

export class Constants {
    public static readonly DISPLAY_NAME = 'nuBond';

    private static _compliantWithW3C = false;
    public static get COMPLIANT_WITH_WC() : boolean {
        return this._compliantWithW3C;
    }

    //default prefixes
    private static readonly DEFAULT_PREFIX = 'nb';
    private static readonly COMPLIANT_PREFIX = `data-${this.DEFAULT_PREFIX}`;
    private static _prefix = this.DEFAULT_PREFIX;
    public static get PREFIX() {
        return this._prefix;
    }
    
    private static _prefixAndSeparator = `${this._prefix}-`;
    public static get PREFIX_AND_SEPARATOR() {
        return this._prefixAndSeparator;
    }

    private static readonly DEFAULT_META_VALUE_SEPARATOR = ':';
    private static readonly COMPLIANT_META_VALUE_SEPARATOR = '--';
    private static _metaValueSeparator = this.DEFAULT_META_VALUE_SEPARATOR;
    public static get META_VALUE_SEPARATOR(): string {
        return this._metaValueSeparator;
    } 
    
    private static _styles = new StylesConstants(this._prefix);
    public static get STYLES(): StylesConstants {
        return this._styles;
    }

    private static _expressions = new ExpressionsConstants();
    public static get EXPRESSIONS(): ExpressionsConstants {
        return this._expressions;
    }

    private static _handlers = new HandlersConstants(this._prefix, this._metaValueSeparator);
    public static get HANDLERS(): HandlersConstants {
        return this._handlers;
    }

    private constructor() { }
    
    public static changeCompliancyWithW3C(isCompliant: boolean): void {
        if (this._compliantWithW3C != isCompliant) {
            this._compliantWithW3C = isCompliant;

            this._prefix = this._compliantWithW3C ? this.COMPLIANT_PREFIX : this.DEFAULT_PREFIX;
            this._prefixAndSeparator = `${this._prefix}-`;
            this._metaValueSeparator = this._compliantWithW3C ? this.COMPLIANT_META_VALUE_SEPARATOR : this.DEFAULT_META_VALUE_SEPARATOR;

            this._styles = new StylesConstants(this._prefix);
            this._handlers = new HandlersConstants(this._prefix, this._metaValueSeparator);
        }
    }
}