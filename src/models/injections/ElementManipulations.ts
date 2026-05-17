/**
 * HTML element property manipulations.
 */
export class ElementPropertiesManipulations {
    private readonly _get: (propertyKey: string) => any;
    private readonly _set: (propertyKey: string, propertyValue: any) => void;

    constructor(get: (propertyKey: string) => any, set: (propertyKey: string, propertyValue: any) => void) {
        this._get = get;
        this._set = set;
    }

    /**
     * Get a property value of an HTML element.
     *
     * @param propertyKey property key
     * @returns property value
     */
    public get(propertyKey: string): any {
        return this._get(propertyKey);
    }

    /**
     * Set a property value on an HTML element.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param propertyKey property key
     * @param propertyValue property value
     */
    public set(propertyKey: string, propertyValue: any): void {
        this._set(propertyKey, propertyValue);
    }
}

/**
 * HTML element attribute manipulations.
 */
export class ElementAttributesManipulations {
    private readonly _has: (attributeName: string) => boolean;
    private readonly _get: (attributeName: string) => string | undefined;
    private readonly _getAll: () => Readonly<Map<string, string | undefined>>;
    private readonly _set: (attributeName: string, attributeValue?: string | null) => void;
    private readonly _remove: (attributeName: string) => void;

    constructor(has: (attributeName: string) => boolean,
                get: (attributeName: string) => string | undefined, getAll: () => Readonly<Map<string, string | undefined>>,
                set: (attributeName: string, attributeValue?: string | null) => void, remove: (attributeName: string) => void) {
        this._has = has;
        this._get = get;
        this._getAll = getAll;
        this._set = set;
        this._remove = remove;
    }

    /**
     * Check whether the HTML element has an attribute.
     *
     * @param attributeName attribute name
     * @returns true - the HTML element has the attribute; false - otherwise
     */
    public has(attributeName: string): boolean {
        return this._has(attributeName);
    }

    /**
     * Get an HTML element attribute value.
     *
     * @param attributeName attribute name
     * @returns attribute value
     */
    public get(attributeName: string): string | undefined {
        return this._get(attributeName);
    }

    /**
     * Get all HTML element attributes with their values.
     *
     * @returns HTML element attributes with their values
     */
    public getAll(): Readonly<Map<string, string | undefined>> {
        return this._getAll();
    }

    /**
     * Set an HTML element attribute value.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param attributeName attribute name
     * @param attributeValue attribute value
     */
    public set(attributeName: string, attributeValue?: string | null): void {
        this._set(attributeName, attributeValue);
    }

    /**
     * Remove an HTML element attribute.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param attributeName attribute name
     */
    public remove(attributeName: string): void {
        this._remove(attributeName);
    }
}

/**
 * HTML element style manipulations.
 */
export class ElementStylesManipulations {
    private readonly _has: (propertyName: string) => boolean;
    private readonly _get: (propertyName: string) => string | undefined;
    private readonly _getAll: () => Readonly<Map<string, string>>;
    private readonly _set: (propertyName: string, propertyValue?: string | null) => void;
    private readonly _remove: (propertyName: string) => void;

    constructor(has: (propertyName: string) => boolean, 
                get: (propertyName: string) => string | undefined, getAll: () => Readonly<Map<string, string>>,
                set: (propertyName: string, propertyValue?: string | null) => void,
                remove: (propertyName: string) => void) {
        this._has = has;
        this._get = get;
        this._getAll = getAll;
        this._set = set;
        this._remove = remove;
    }

    /**
     * Check whether the HTML element has a style.
     *
     * @param propertyName style name
     * @returns true - the HTML element has the style; false - otherwise
     */
    public has(propertyName: string): boolean {
        return this._has(propertyName);
    }

    /**
     * Get an HTML element style value.
     *
     * @param propertyName style name
     * @returns style value
     */
    public get(propertyName: string): string | undefined {
        return this._get(propertyName);
    }

    /**
     * Get all HTML element styles with their values.
     *
     * @returns HTML element styles with their values
     */
    public getAll(): Readonly<Map<string, string>> {
        return this._getAll();
    }

    /**
     * Set an HTML element style value.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param propertyName style name
     * @param propertyValue style value
     */
    public set(propertyName: string, propertyValue?: string | null): void {
        this._set(propertyName, propertyValue);
    }

    /**
     * Remove an HTML element style.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param propertyName style name
     */
    public remove(propertyName: string): void {
        this._remove(propertyName);
    }
}

/**
 * HTML element class manipulations.
 */
export class ElementClassesManipulations {
    private readonly _has: (className: string) => boolean;
    private readonly _getAll: () => Readonly<Array<string>>;
    private readonly _add: (className: string) => void;
    private readonly _remove: (className: string) => void;
    private readonly _toggle: (className: string) => void;

    constructor(has: (className: string) => boolean,
                getAll: () => Readonly<Array<string>>,
                add: (className: string) => void, remove: (className: string) => void, toggle: (className: string) => void) {
        this._has = has;
        this._getAll = getAll;
        this._add = add;
        this._remove = remove;
        this._toggle = toggle;
    }

    /**
     * Check whether the HTML element has a class.
     *
     * @param className class name
     * @returns true - the HTML element has the class; false - otherwise
     */
    public has(className: string): boolean {
        return this._has(className);
    }

    /**
     * Get all HTML element classes.
     *
     * @returns HTML element classes
     */
    public getAll(): Readonly<Array<string>> {
        return this._getAll();
    }

    /**
     * Add a class to the HTML element.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param className class name
     */
    public add(className: string): void {
        this._add(className);
    }

    /**
     * Remove a class from the HTML element.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param className class name
     */
    public remove(className: string): void {
        this._remove(className);
    }

    /**
     * Toggle a class on the HTML element.
     * Automatically triggers change detection when a change is detected.
     * Debounced - safe to call multiple times in a row.
     *
     * @param className class name
     */
    public toggle(className: string): void {
        this._toggle(className);
    }
}

/**
* Injection class for manipulating the entity's root HTML element.
* Available in handlers: Event and Bound.
* Available in classes decorated with: Component and Aspect.
*/
export class ElementManipulations {
    /**
     * HTML element property manipulations.
     */
    public readonly properties: ElementPropertiesManipulations;
    /**
     * HTML element attribute manipulations.
     */
    public readonly attributes: ElementAttributesManipulations;
    /**
     * HTML element style manipulations.
     */
    public readonly styles: ElementStylesManipulations;
    /**
     * HTML element class manipulations.
     */
    public readonly classes: ElementClassesManipulations;

    constructor(properties: ElementPropertiesManipulations, attributes: ElementAttributesManipulations,
                styles: ElementStylesManipulations, classes: ElementClassesManipulations) {
        this.properties = properties;
        this.attributes = attributes;
        this.styles = styles;
        this.classes = classes;
    }
}