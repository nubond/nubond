import { Helpers } from "./Helpers";

export class Constants {
    public static readonly DISPLAY_NAME = 'nuBond';
    public static readonly DEFAULT_SEPARATOR = '-'; 

    private static _compliantWithW3C = false;
    public static get COMPLIANT_WITH_WC() : boolean {
        return this._compliantWithW3C;
    }

    private static readonly _nonCompliantPrefix = 'nb';
    private static readonly _compliantPrefix = `data${this.DEFAULT_SEPARATOR}${this._nonCompliantPrefix}`;
    private static _defaultPrefix = this.getDefaultPrefix();
    public static get DEFAULT_PREFIX() {
        return this._defaultPrefix;
    }

    private static readonly DEFAULT_HIDE_CLASS_NAME_SUFFIX = 'hidden';
    private static _defaultHideClassName = this.getDefaultNHideClassName();
    public static get DEFAULT_HIDE_CLASS_NAME(): string {
        return this._defaultHideClassName;
    }

    private static readonly _defaultNHideClassTemplate = `
.{0} { 
    display: none !important;
}`;
    private static _defaultHideStyle = this.getDefaultNHideStyle();
    public static get DEFAULT_HIDE_STYLE(): string {
        return this._defaultHideStyle;
    }

    private static readonly _defaultProcessingHideClassTemplate = `
* {
    [nb-template]:not([nb-template-ready]), [data-nb-template]:not([data-nb-template-ready]),
    [nb-if]:not([nb-if-ready]), [data-nb-if]:not([data-nb-if-ready]) { 
        display: none !important; 
    }
    
    [nb-container]:not([nb-container-ready]), [data-nb-container]:not([data-nb-container-ready]),
    [nb-component]:not([nb-component-ready]), [data-nb-component]:not([data-nb-component-ready]),
    [nb-repeat]:not([nb-repeat-ready]), [data-nb-repeat]:not([data-nb-repeat-ready]),
    [nb-switch]:not([nb-switch-ready]), [data-nb-switch]:not([data-nb-switch-ready]) {
        display: none; 
    }
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
    public static readonly PROJECTION_ATTRIBUTE_PREFIX_NAME = 'projection'; //projection
    public static readonly PROJECTION_PARENT_SLOT_ATTRIBUTE_PREFIX_NAME = 'project-to'; //projection target
    public static readonly PROJECTION_REPLACE_SLOT_ATTRIBUTE_PREFIX_NAME = 'project-instead'; //projection target instead

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

    private static _knownHandlers = this.getKnownHandlers();
    public static get KNOWN_HANDLERS(): Readonly<Array<string>> {
        return this._knownHandlers;
    }

    private static _knownHandlersSet = this.getKnownHandlersSet();
    public static get KNOWN_HANDLERS_SET(): Readonly<Set<string>> {
        return this._knownHandlersSet;
    }

    private static _knownPrefixHandlers = this.getKnownPrefixHandlers();
    public static get KNOWN_PREFIX_HANDLERS(): Readonly<Array<string>> {
        return this._knownPrefixHandlers;
    }

    private static _knownHandlersWithoutValue = this.getKnownHandlersWithoutValue();
    public static get KNOWN_HANDLERS_WITHOUT_VALUE(): Readonly<Array<string>> {
        return this._knownHandlersWithoutValue;
    }

    private static _knownHandlerExtensions = this.getKnownHandlerExtensions();
    public static get KNOW_HANDLER_EXTENSIONS() : Readonly<Set<string>> {
        return this._knownHandlerExtensions;
    }

    private static _knownHandlerExtensionsWithoutValues = this.getKnownHandlerExtensionsWithoutValues();
    public static get KNOW_HANDLER_EXTENSIONS_WITHOUT_VALUES() : Readonly<Set<string>> {
        return this._knownHandlerExtensionsWithoutValues;
    }

    private static _reserverContextNames = this.getReserverContextNames();
    public static get RESERVED_CONTEXT_NAMES(): Readonly<Set<string>> {
        return this._reserverContextNames;
    }

    private constructor() {}
    
    public static changeCompliancyWithW3C(isCompliant: boolean): void {
        if (this._compliantWithW3C != isCompliant) {
            this._compliantWithW3C = isCompliant;

            this._defaultPrefix = this.getDefaultPrefix();
            this._metaValueSeparator = this.getMetaValueSeparator();

            this._defaultHideClassName = this.getDefaultNHideClassName();
            this._defaultHideStyle = this.getDefaultNHideStyle();

            this._knownHandlers = this.getKnownHandlers();
            this._knownHandlersSet = this.getKnownHandlersSet();
            this._knownHandlersWithoutValue = this.getKnownHandlersWithoutValue();

            this._knownPrefixHandlers = this.getKnownPrefixHandlers();
            this._knownHandlerExtensions = this.getKnownHandlerExtensions();
            this._knownHandlerExtensionsWithoutValues = this.getKnownHandlerExtensionsWithoutValues();
        }
    }

    private static getDefaultPrefix(): string {
        return this._compliantWithW3C ? this._compliantPrefix : this._nonCompliantPrefix;
    }

    private static getMetaValueSeparator(): string {
        return this._compliantWithW3C ? this._w3cCompliantMetaValueSeparator : this._defaultMetaValueSeparator;
    }

    private static getDefaultNHideClassName(): string {
        return this.DEFAULT_PREFIX + this.DEFAULT_SEPARATOR + this.DEFAULT_HIDE_CLASS_NAME_SUFFIX;
    }

    private static getDefaultNHideStyle(): string {
        return Helpers.format(this._defaultNHideClassTemplate, this.DEFAULT_HIDE_CLASS_NAME);
    }

    private static getDefaultProcessingHideStyle(): string {
        return this._defaultProcessingHideClassTemplate;
    }
    
    private static getKnownHandlers(): Readonly<Array<string>> {
        const defaultFullPrefix = this.DEFAULT_PREFIX + this.DEFAULT_SEPARATOR;
        return Object.freeze([
            defaultFullPrefix + this.VALUE_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.HTML_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.CLASS_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.STYLE_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.IF_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.CONTAINER_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.EXEC_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.SWITCH_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.SWITCH_CASE_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.TEMPLATE_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.BOUND_HANDLER_ATTRIBUTE_NAME
        ]);
    }

    private static getKnownHandlersSet(): Readonly<Set<string>> {
        return Object.freeze(new Set(this.getKnownHandlers()));
    }

    private static getKnownPrefixHandlers(): Readonly<Array<string>> {
        const defaultFullPrefix = this.DEFAULT_PREFIX + this.DEFAULT_SEPARATOR;
        return Object.freeze([
            defaultFullPrefix + this.REPEAT_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.PROPERTY_HANDLER_ATTRIBUTE_NAME, 
            defaultFullPrefix + this.ATTRIBUTE_HANDLER_ATTRIBUTE_NAME, 
            defaultFullPrefix + this.EVENT_HANDLER_ATTRIBUTE_PREFIX_NAME,
            defaultFullPrefix + this.ASPECT_HANDLER_PREFIX_NAME,
            defaultFullPrefix + this.VARIABLE_HANDLER_PREFIX_NAME,
            defaultFullPrefix + this.IN_HANDLER_ATTRIBUTE_NAME,
            defaultFullPrefix + this.IN_REF_HANDLER_ATTRIBUTE_NAME
        ]);
    }

    private static getKnownHandlersWithoutValue(): Readonly<Array<string>> {
        const defaultFullPrefix = this.DEFAULT_PREFIX + this.DEFAULT_SEPARATOR;
        return Object.freeze([
            defaultFullPrefix + this.ASPECT_HANDLER_PREFIX_NAME,
            defaultFullPrefix + this.SWITCH_DEFAULT_HANDLER_ATTRIBUTE_NAME
        ]);
    }

    private static getKnownHandlerExtensions(): Readonly<Set<string>> {
        const defaultFullPrefix = this.DEFAULT_PREFIX + this.DEFAULT_SEPARATOR;
        return Object.freeze(new Set([
            defaultFullPrefix + this.PROJECTION_ATTRIBUTE_PREFIX_NAME, defaultFullPrefix + this.PROJECTION_PARENT_SLOT_ATTRIBUTE_PREFIX_NAME, 
            defaultFullPrefix + this.PROJECTION_REPLACE_SLOT_ATTRIBUTE_PREFIX_NAME
        ]));
    }

    private static getKnownHandlerExtensionsWithoutValues(): Readonly<Set<string>> {
        const defaultFullPrefix = this.DEFAULT_PREFIX + this.DEFAULT_SEPARATOR;
        return Object.freeze(new Set([
            defaultFullPrefix + this.PROJECTION_ATTRIBUTE_PREFIX_NAME, defaultFullPrefix + this.PROJECTION_PARENT_SLOT_ATTRIBUTE_PREFIX_NAME, 
            defaultFullPrefix + this.PROJECTION_REPLACE_SLOT_ATTRIBUTE_PREFIX_NAME, defaultFullPrefix + this.COMPONENT_MARKER_ATTRIBUTE_NAME
        ]));
    }

    private static getReserverContextNames(): Readonly<Set<string>> {
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