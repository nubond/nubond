export class Constants {
    public static readonly DISPLAY_NAME = 'nuBond';
    public static readonly DEFAULT_SEPARATOR = '-'; 

    private static _compliantWithW3C = false;
    public static get COMPLIANT_WITH_WC() : boolean {
        return this._compliantWithW3C;
    }

    //default prefixes
    private static readonly _nonCompliantPrefix = 'nb';
    private static readonly _compliantPrefix = `data${this.DEFAULT_SEPARATOR}${this._nonCompliantPrefix}`;
    private static _defaultPrefix = this.getDefaultPrefix();
    public static get DEFAULT_PREFIX() {
        return this._defaultPrefix;
    }

    private static _defaultPrefixAndSeparator = this.getDefaultPrefixAndSeparator();
    public static get DEFAULT_PREFIX_AND_SEPARATOR(): string {
        return this._defaultPrefixAndSeparator;
    }

    private static readonly DEFAULT_HIDE_CLASS_NAME_SUFFIX = 'hidden';
    private static _defaultHideClassName = this.getDefaultNHideClassName();
    public static get DEFAULT_HIDE_CLASS_NAME(): string {
        return this._defaultHideClassName;
    }

    private static readonly _defaultNHideClassTemplate = `
.nb-hidden, .data-nb-hidden { 
    display: none !important;
}`;
    private static _defaultHideStyle = this.getDefaultNHideStyle();
    public static get DEFAULT_HIDE_STYLE(): string {
        return this._defaultHideStyle;
    }

    private static readonly _defaultProcessingHideClassTemplate = `
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
    private static _defaultProcessingHideStyle = this.getDefaultProcessingHideStyle();
    public static get DEFAULT_PROCESSING_HIDE_STYLE(): string {
        return this._defaultProcessingHideStyle;
    }
    
    private static readonly _defaultMetaValueSeparator = ':';
    private static readonly _w3cCompliantMetaValueSeparator = (this.DEFAULT_SEPARATOR + this.DEFAULT_SEPARATOR);
    private static _metaValueSeparator = this.getMetaValueSeparator();
    public static get META_VALUE_SEPARATOR(): string {
        return this._metaValueSeparator;
    } 

    public static readonly SINGLE_BIND_PREFIX_CHAR = '#';
    public static readonly CONSTANT_BIND_PREFIX_CHAR = '@';
    
    public static readonly HANDLER_READY_ATTRIBUTE_SUFFIX = 'ready'; //mark needed element as ready

    //regular handlers
    public static readonly VALUE_HANDLER_ATTRIBUTE_NAME = 'value';              //bind data to element textContent
    public static readonly HTML_HANDLER_ATTRIBUTE_NAME = 'html';                //bind data to element innerHTML
    public static readonly CLASS_HANDLER_ATTRIBUTE_NAME = 'class';              //bind data to classes
    public static readonly STYLE_HANDLER_ATTRIBUTE_NAME = 'style';              //bind data to element style
    public static readonly IF_HANDLER_ATTRIBUTE_NAME = 'if';                    //if expression is true, element will be shown, if false, hidden class from hiddenClassName will be added
    public static readonly REPEAT_HANDLER_ATTRIBUTE_NAME = 'repeat';            //repeat current element in loop, first element in repeat sequences is treated as repeat template.
    public static readonly EXEC_HANDLER_ATTRIBUTE_NAME = 'exec';                //execute expression
    public static readonly SWITCH_HANDLER_ATTRIBUTE_NAME = 'switch';            //switch
    public static readonly SWITCH_CASE_HANDLER_ATTRIBUTE_NAME = "case";         //case
    public static readonly SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME = "default";   //default
    public static readonly TEMPLATE_HANDLER_ATTRIBUTE_NAME = 'template';        //template
    public static readonly BOUND_HANDLER_ATTRIBUTE_NAME = 'bound';              //bound

    //regular handlers with contexts
    public static readonly CONTAINER_HANDLER_ATTRIBUTE_NAME = 'container'; //container binding
    public static readonly ASPECT_HANDLER_PREFIX_NAME = 'aspect';          //aspect binding

    //prefix handlers
    public static readonly PROPERTY_HANDLER_ATTRIBUTE_NAME = 'prop';       //bind data to prop
    public static readonly ATTRIBUTE_HANDLER_ATTRIBUTE_NAME = 'attr';      //bind data to attr
    public static readonly EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME = 'event';  //bind to event
    public static readonly VARIABLE_HANDLER_PREFIX_NAME = 'var';           //bind to variable
    public static readonly IN_HANDLER_ATTRIBUTE_NAME = 'in';               //bind data to component or container input
    public static readonly IN_REF_HANDLER_ATTRIBUTE_NAME = 'in-ref';               //bind data to component or container input

    //other
    //projection
    public static readonly PROJECTION_ATTRIBUTE_NAME = 'projection'; //projection
    public static readonly ENCAPSULATED_ATTRIBUTE_NAME = 'encapsulated'; //encapsulated
    public static readonly PROJECT_TO_ATTRIBUTE_NAME = 'project-to'; //projection to element
    public static readonly PROJECT_INSTEAD_ATTRIBUTE_NAME = 'project-instead'; //projection instead of this element

    //markers
    public static readonly COMPONENT_MARKER_ATTRIBUTE_NAME = 'component'; //component binding

    //execution function possible arguments
    //in repeat
    public static readonly INDEX_EXECUTION_PARAM_NAME = 'index'; //current loop index, used only in nb-repeat
    public static readonly ITEM_EXECUTION_PARAM_NAME = 'item'; //current loop time, used only in nb-repeat
    public static readonly TOTAL_COUNT_EXECUTION_PARAM_NAME = 'count'; //current loop total count, used only in nb-repeat
    //in event
    public static readonly EVENT_EXECUTION_PARAM_NAME = 'event'; //link to event wrapper, used only in nb-event
    public static readonly DATA_EXECUTION_PARAM_NAME = 'data'; //link to custom event data
    public static readonly ROUTER_EXECUTION_PARAM_NAME = 'router'; //link to event wrapper, used only in nb-event
    public static readonly UNSUBSCRIBE_EXECUTION_PARAM_NAME = 'unSubscribe'; //unsubscribe from event, used only in nb-event
    
    //in event and in binded
    public static readonly NATIVE_ELEMENT_EXECUTION_PARAM_NAME = 'nativeElement'; //link to native element
    public static readonly ELEMENT_EXECUTION_PARAM_NAME = 'element'; //link to ElementManipulations

    //fully-qualified names
    //suffixes
    private static _readySuffix = this.getReadySuffix();
    public static get READY_SUFFIX(): string {
        return this._readySuffix;
    }

    //projections
    private static _fullProjectionAttributeName = this.getFullProjectionAttributeName();
    public static get FULL_PROJECTION_ATTRIBUTE_NAME(): string {
        return this._fullProjectionAttributeName;
    }

    private static _fullEncapsulatedAttributeName = this.getFullEncapsulatedAttributeName();
    public static get FULL_ENCAPSULATED_ATTRIBUTE_NAME(): string {
        return this._fullEncapsulatedAttributeName;
    }

    private static _fullProjectionProjectToAttributeName = this.getFullProjectToAttributeName();
    public static get FULL_PROJECT_TO_ATTRIBUTE_NAME(): string {
        return this._fullProjectionProjectToAttributeName;
    }

    private static _fullProjectionProjectInsteadAttributeName = this.getFullProjectInsteadAttributeName();
    public static get FULL_PROJECT_INSTEAD_ATTRIBUTE_NAME(): string {
        return this._fullProjectionProjectInsteadAttributeName;
    }

    //handlers collections
    //simple handlers, like nb-value="this.value"
    private static _knownHandlers = this.getKnownHandlers();
    public static get KNOWN_HANDLERS(): Readonly<Array<string>> {
        return this._knownHandlers;
    }

    private static _knownHandlersSet = this.getKnownHandlersSet();
    public static get KNOWN_HANDLERS_SET(): ReadonlySet<string> {
        return this._knownHandlersSet;
    }

    private static _knownHandlersWithoutValue = this.getKnownHandlersWithoutValue();
    public static get KNOWN_HANDLERS_WITHOUT_VALUE(): Readonly<Array<string>> {
        return this._knownHandlersWithoutValue;
    }

    //prefix handlers, like nb-event:click="this.click()"
    private static _knownPrefixHandlers = this.getKnownPrefixHandlers();
    public static get KNOWN_PREFIX_HANDLERS(): Readonly<Array<string>> {
        return this._knownPrefixHandlers;
    }
    
    private static _knownPrefixHandlersWithOptionalMeta = this.getKnownPrefixHandlersWithOptionalMeta();
    public static get KNOWN_PREFIX_HANDLERS_WITH_OPTIONAL_META(): ReadonlySet<string> {
        return this._knownPrefixHandlersWithOptionalMeta;
    }

    private static _knownPrefixHandlersWithMetaSeparator = this.getKnownPrefixHandlersWithMetaSeparator();
    public static get KNOWN_PREFIX_HANDLERS_WITH_META_SEPARATOR(): Readonly<Array<string>> {
        return this._knownPrefixHandlersWithMetaSeparator;
    }

    //Handler extensions, like nb-in:test="this.test"
    private static _knownHandlerExtensions = this.getKnownHandlerExtensions();
    public static get KNOWN_HANDLER_EXTENSIONS() : ReadonlySet<string> {
        return this._knownHandlerExtensions;
    }

    private static _knownHandlerPrefixExtensions = this.getKnownHandlerPrefixExtensions();
    public static get KNOWN_HANDLER_PREFIX_EXTENSIONS() : Readonly<Array<string>> {
        return this._knownHandlerPrefixExtensions;
    }

    private static _knownHandlerPrefixExtensionsWithMetaSeparator = this.getKnownHandlerPrefixExtensionsWithMetaSeparator();
    public static get KNOWN_HANDLER_PREFIX_EXTENSIONS_WITH_META_SEPARATOR() : Readonly<Array<string>> {
        return this._knownHandlerPrefixExtensionsWithMetaSeparator;
    }

    private static _knownHandlerExtensionsWithoutValues = this.getKnownHandlerExtensionsWithoutValues();
    public static get KNOWN_HANDLER_EXTENSIONS_WITHOUT_VALUES() : ReadonlySet<string> {
        return this._knownHandlerExtensionsWithoutValues;
    }

    //other
    private static _reserverContextNames = this.getReserverContextNames();
    public static get RESERVED_CONTEXT_NAMES(): ReadonlySet<string> {
        return this._reserverContextNames;
    }

    private constructor() {}
    
    public static changeCompliancyWithW3C(isCompliant: boolean): void {
        if (this._compliantWithW3C != isCompliant) {
            this._compliantWithW3C = isCompliant;

            this._defaultPrefix = this.getDefaultPrefix();
            this._metaValueSeparator = this.getMetaValueSeparator();

            this._defaultPrefixAndSeparator = this.getDefaultPrefixAndSeparator();
            this._readySuffix = this.getReadySuffix();

            this._fullProjectionAttributeName = this.getFullProjectionAttributeName();
            this._fullEncapsulatedAttributeName = this.getFullEncapsulatedAttributeName();
            this._fullProjectionProjectToAttributeName = this.getFullProjectToAttributeName();
            this._fullProjectionProjectInsteadAttributeName = this.getFullProjectInsteadAttributeName();

            this._defaultProcessingHideStyle = this.getDefaultProcessingHideStyle();
            this._defaultHideClassName = this.getDefaultNHideClassName();
            this._defaultHideStyle = this.getDefaultNHideStyle();

            this._knownHandlers = this.getKnownHandlers();
            this._knownHandlersSet = this.getKnownHandlersSet();
            this._knownHandlersWithoutValue = this.getKnownHandlersWithoutValue();

            this._knownPrefixHandlers = this.getKnownPrefixHandlers();
            this._knownPrefixHandlersWithOptionalMeta = this.getKnownPrefixHandlersWithOptionalMeta();
            this._knownPrefixHandlersWithMetaSeparator = this.getKnownPrefixHandlersWithMetaSeparator();

            this._knownHandlerExtensions = this.getKnownHandlerExtensions();
            this._knownHandlerPrefixExtensions = this.getKnownHandlerPrefixExtensions();
            this._knownHandlerPrefixExtensionsWithMetaSeparator = this.getKnownHandlerPrefixExtensionsWithMetaSeparator();
            this._knownHandlerExtensionsWithoutValues = this.getKnownHandlerExtensionsWithoutValues();
        }
    }

    //prefixes and suffixes
    private static getDefaultPrefix(): string {
        return this._compliantWithW3C ? this._compliantPrefix : this._nonCompliantPrefix;
    }

    private static getMetaValueSeparator(): string {
        return this._compliantWithW3C ? this._w3cCompliantMetaValueSeparator : this._defaultMetaValueSeparator;
    }


    private static getDefaultPrefixAndSeparator(): string {
        return this.DEFAULT_PREFIX + this.DEFAULT_SEPARATOR;
    }

    private static getReadySuffix(): string {
        return this.DEFAULT_SEPARATOR + this.HANDLER_READY_ATTRIBUTE_SUFFIX;
    }

    //styles
    private static getDefaultNHideClassName(): string {
        return this.DEFAULT_PREFIX_AND_SEPARATOR + this.DEFAULT_HIDE_CLASS_NAME_SUFFIX;
    }

    private static getDefaultNHideStyle(): string {
        return this._defaultNHideClassTemplate;
    }

    private static getDefaultProcessingHideStyle(): string {
        return this._defaultProcessingHideClassTemplate;
    }

    //fully-qualified names
    private static getFullProjectionAttributeName(): string {
        return this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECTION_ATTRIBUTE_NAME;
    }

    private static getFullEncapsulatedAttributeName(): string {
        return this.DEFAULT_PREFIX_AND_SEPARATOR + this.ENCAPSULATED_ATTRIBUTE_NAME;
    }

    private static getFullProjectToAttributeName(): string {
        return this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECT_TO_ATTRIBUTE_NAME;
    }

    private static getFullProjectInsteadAttributeName(): string {
        return this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECT_INSTEAD_ATTRIBUTE_NAME;
    }

    //simple handlers
    private static getKnownHandlers(): Readonly<Array<string>> {
        return Object.freeze([
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.VALUE_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.HTML_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.CLASS_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.STYLE_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.IF_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.CONTAINER_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.EXEC_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.SWITCH_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.TEMPLATE_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.BOUND_HANDLER_ATTRIBUTE_NAME
        ]);
    }

    private static getKnownHandlersSet(): ReadonlySet<string> {
        return Object.freeze(new Set(this.getKnownHandlers()));
    }

    //prefix handlers
    private static getKnownPrefixHandlers(): Readonly<Array<string>> {
        return Object.freeze([
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.REPEAT_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROPERTY_HANDLER_ATTRIBUTE_NAME, 
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME, 
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.ASPECT_HANDLER_PREFIX_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.VARIABLE_HANDLER_PREFIX_NAME
        ]);
    }

    private static getKnownPrefixHandlersWithMetaSeparator(): Readonly<Array<string>> {
        return Object.freeze(this.getKnownPrefixHandlers().map(el => el + this.META_VALUE_SEPARATOR));
    }

    private static getKnownPrefixHandlersWithOptionalMeta(): ReadonlySet<string> {
        return Object.freeze(new Set([
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.REPEAT_HANDLER_ATTRIBUTE_NAME
        ]));
    }

    private static getKnownHandlersWithoutValue(): Readonly<Array<string>> {
        return Object.freeze([
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.ASPECT_HANDLER_PREFIX_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME
        ]);
    }

    //handler extensions
    private static getKnownHandlerPrefixExtensions(): Readonly<Array<string>> {
        return Object.freeze([
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.IN_HANDLER_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.IN_REF_HANDLER_ATTRIBUTE_NAME
        ]);
    }

    private static getKnownHandlerPrefixExtensionsWithMetaSeparator(): Readonly<Array<string>> {
        return Object.freeze(this.getKnownHandlerPrefixExtensions().map(el => el + this.META_VALUE_SEPARATOR));
    }

    private static getKnownHandlerExtensions(): ReadonlySet<string> {
        return Object.freeze(new Set([
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECTION_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.ENCAPSULATED_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECT_TO_ATTRIBUTE_NAME, 
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECT_INSTEAD_ATTRIBUTE_NAME
        ]));
    }

    private static getKnownHandlerExtensionsWithoutValues(): ReadonlySet<string> {
        return Object.freeze(new Set([ 
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECTION_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.ENCAPSULATED_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECT_TO_ATTRIBUTE_NAME, 
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.PROJECT_INSTEAD_ATTRIBUTE_NAME,
            this.DEFAULT_PREFIX_AND_SEPARATOR + this.COMPONENT_MARKER_ATTRIBUTE_NAME
        ]));
    }

    //other
    private static getReserverContextNames(): ReadonlySet<string> {
        return Object.freeze(new Set([
            //repeat
            this.INDEX_EXECUTION_PARAM_NAME, this.ITEM_EXECUTION_PARAM_NAME, this.TOTAL_COUNT_EXECUTION_PARAM_NAME,

            //events
            this.EVENT_EXECUTION_PARAM_NAME, this.DATA_EXECUTION_PARAM_NAME, this.ROUTER_EXECUTION_PARAM_NAME,
            this.UNSUBSCRIBE_EXECUTION_PARAM_NAME,

            //in event and in binded
            this.NATIVE_ELEMENT_EXECUTION_PARAM_NAME, this.ELEMENT_EXECUTION_PARAM_NAME
        ].map(el => el.toLowerCase())));
    }
}