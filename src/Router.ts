import { CallBackEvent } from './CallBackEvent';

import { Helpers } from './Helpers';
import { Console } from './Console';
import { Constants } from './Constants';

class RouteSlot {
    private readonly _isContainerExists: (containerName: string) => boolean;

    private readonly _slotType: 'constant' | 'variable' | 'component';
    private readonly _defaultValue: string | undefined;

    public readonly name: string | null;

    private _value: string | undefined;
    public get value(): string | undefined {
        return this._value;
    }

    constructor(routePart: string, isContainerExists: (containerName: string) => boolean) {
        this._isContainerExists = isContainerExists;

        let trimmedRoutePart = routePart.trim();

        const firstChar = trimmedRoutePart.charAt(0);
        const lastChar = trimmedRoutePart.charAt(trimmedRoutePart.length - 1);

        if (((firstChar == '[') && (lastChar != ']')) || 
            ((firstChar == '{') && (lastChar != '}') )) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router: wrong app initialization meta data detected: route template is wrong.\n Open bracket does not match with closed bracket. Example: [SLOT_NAME] or [SLOT_NAME=DEFAULT_VALUE] or {SLOT_NAME} or {SLOT_NAME=DEFAULT_VALUE}.`);
        }

        this._slotType = firstChar == '['
                            ? 'component'
                            : (firstChar == '{'
                                    ? 'variable'
                                    : 'constant');

        if (this._slotType == 'constant') {
            this.name = null;
            this._defaultValue = trimmedRoutePart;
        } else {
            const splittedRoutePart = trimmedRoutePart.substring(1, trimmedRoutePart.length - 1).split('=');
            if (splittedRoutePart.length > 2) {
                throw new Error(`${Constants.DISPLAY_NAME}: Router: wrong app initialization meta data detected: route template is wrong.\nThere can be only one default value. Example: [SLOT_NAME=DEFAULT_VALUE] or {SLOT_NAME=DEFAULT_VALUE}.`);
            }

            this.name = splittedRoutePart[0].trim();
            if (this.name.length == 0) {
                throw new Error(`${Constants.DISPLAY_NAME}: Router: wrong app initialization meta data detected: route template is wrong.\nSlot name can't be empty.`);
            }

            if (splittedRoutePart.length == 2) {
                this._defaultValue = splittedRoutePart[1].trim();
            }
        }

        this._value = this._defaultValue;
    }

    public setValue(value: any): boolean {
        let result = true;

        if (this._value !== value) {
            if (this._slotType != 'constant') {
                if (Helpers.isUndefined(value) || (value === null) || (Helpers.isString(value) && (<string>value).trim().length == 0)) {
                    this.resetValue();
                } else {
                    const stringifiedValue = (Helpers.isString(value) ? (<string>value) : Helpers.stringify(value)).trim();
                    if ((this._slotType == 'component') && (stringifiedValue.length > 0) && !this._isContainerExists(stringifiedValue)) {
                        result = false;
                        Console.error(`Router: container '${stringifiedValue}' not found, can't route.`);
                        return result;
                    }

                    this._value = stringifiedValue;
                }
            }
        }

        return result;
    }

    public resetValue(): void {
        this._value = this._defaultValue;
    }
}

export interface IRouter {
    //is router configured
    readonly isConfigured: boolean;
    //is router is hash-based
    readonly hashBased: boolean;

    //current path
    readonly path: string | undefined;
    //current state
    readonly state: Readonly<{[key: string]: string | undefined}> | undefined;

    /**
     * Go to a specific state.
     *
     * @param state state
     * @param partialState true - the new state is merged with the current state; false - the new state replaces the current state
     * @param removeHistory true - replace the current history entry; false - push a new history entry
     */
    go(state?: {[key: string]: string | number | null | undefined} | string, partialState?: boolean, removeHistory?: boolean): void;

    /**
     * Go to the previous state.
     */
    goBack(): void;

    /**
     * Go to a specific state in history by offset.
     *
     * @param offset history offset
     */
    goTo(offset: number): void;

    /**
     * Go to the next state.
     */
    goForward(): void;

    /**
     * Subscribe to a BeforeStateChange event.
     *
     * @param callBack callback
     * @returns function to unsubscribe from the event
     */
    onBeforeStateChange(callBack: (preventChange: () => void, oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void): () => void;

    /**
     * Subscribe to an AfterStateChange event.
     *
     * @param callBack callback
     * @returns function to unsubscribe from the event
     */
    onAfterStateChange(callBack: (oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void): () => void;
}

/**
* State-based router.
*/
export class Router implements IRouter {
    private readonly _getShowDebugInfo: () => boolean;

    private readonly _documentPath: string | undefined;

    private readonly _routeSlots: Array<RouteSlot> | undefined;
    private readonly _routeObj: {[key: string]: RouteSlot} | undefined;
    private readonly _routeSlotNames: Array<string> | undefined;

    private readonly _isSingleSlotted: boolean;

    private readonly _onBeforeStateChangeCallBackEvent = new CallBackEvent<(preventChange: () => void, oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void>();
    private readonly _onAfterStateChangeCallBackEvent = new CallBackEvent<(oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void>();

    private _stateChangeInProgress = false;
    private _deferredStateChangeRequest: (() => void) | undefined;

    private _states: Array<{[key: string]: string | undefined}> = [];
    private _stateIndex = 0;

    private _isConfigured = false;
    //is router configured
    public get isConfigured(): boolean {
        return this._isConfigured;
    }

    private _hashBased = false;
    //is router is hash-based
    public get hashBased(): boolean {
        return this._hashBased;
    }

    private _path: string | undefined;
    //current path
    public get path(): string | undefined {
        return this._path;
    }

    private __state: {[key: string]: string | undefined} | undefined;
    private __frozenState: {[key: string]: string | undefined} | undefined;
    private get _state(): {[key: string]: string | undefined} | undefined {
        return this.__state;
    }
    private set _state(value: {[key: string]: string | undefined} | undefined) {
        this.__state = value;
        this.__frozenState = !Helpers.isUndefined(value)
                                ? Object.freeze(Object.assign({}, value))
                                : value;
    }
    //current state
    public get state(): Readonly<{[key: string]: string | undefined}> | undefined {
        return this.__frozenState;
    }

    constructor(routeConfig: string | undefined, isContainerExists: (containerName: string) => boolean, getShowDebugInfo: () => boolean) {
        this._getShowDebugInfo = getShowDebugInfo;
        
        if (Helpers.isNotEmptyString(routeConfig)) {
            this._isConfigured = true;

            this._documentPath = location.pathname + location.search;

            let rawRouteConfig = routeConfig!.trim();
            if (rawRouteConfig.startsWith('/')) {
                rawRouteConfig = rawRouteConfig.substring(1).trim();
            }

            if (rawRouteConfig.startsWith('#')) {
                this._hashBased = true;
                rawRouteConfig = rawRouteConfig.substring(1).trim();
            }

            this._routeSlots = rawRouteConfig.split('/').filter(el => Helpers.isNotEmptyString(el)).map(el => new RouteSlot(el, containerName => isContainerExists(containerName)));
            this._routeObj = Object.create(null);
            this._routeSlotNames = [];

            this._isSingleSlotted = (this._routeSlots.length == 1) && Helpers.isNotEmptyString(this._routeSlots[0].name);

            for (const slot of this._routeSlots) {
                if (Helpers.isString(slot.name)) {
                    this._routeObj![slot.name!] = slot;
                    this._routeSlotNames.push(slot.name!);
                }
            }

            //update current state based on URL
            const routeState = this.getStateFromRoute();
            if (Object.getOwnPropertyNames(routeState).length > 0) {
                this.handleStateChange(routeState, true, () => {
                    this._states = [this._state!];
                    this.saveState(true);
                }, true);
            } else {
                if (this._routeSlots.some(el => Helpers.isString(el.name) && Helpers.isString(el.value))) {
                    this.go(undefined, true, true);
                } else {
                    this.handleStateChange(null, false, () => {
                        this._states = [this._state!];
                        this.saveState(true);
                    }, true);
                }
            }

            //will double trigger this.handleStateChange on going to specific path with public methods
            addEventListener('popstate', event => {
                const newState = event.state;
                if (Helpers.isObject(newState)) {
                    const newStateKeys = Object.getOwnPropertyNames(newState);
                    let stateFound = false;

                    for (let distance = 0; distance < this._states.length && !stateFound; distance++) {
                        for (const index of [this._stateIndex - distance, this._stateIndex + distance]) {
                            if ((index >= 0) && (index < this._states.length)) {
                                const state = this._states[index];
                                const stateKeys = Object.getOwnPropertyNames(state);
                                if (newStateKeys.length === stateKeys.length) {
                                    let sameState = true;

                                    for (const key of newStateKeys) {
                                        if (newState[key] !== state[key]) {
                                            sameState = false;
                                            break;
                                        }
                                    }

                                    if (sameState) {
                                        stateFound = true;
                                        this.handleStateChange(newState, false, () => {
                                            this._stateIndex = index;
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (!stateFound) {
                        this.handleStateChange(newState, false, () => {
                            this._states.push(this._state!);
                            this._stateIndex = this._states.length - 1;
                            history.pushState(this._state, '', this.getStatePath());
                        });
                    }
                } else {
                    this.handleStateChange(this.getStateFromRoute(), false, () => {
                        while (this._stateIndex < (this._states.length - 1)) {
                            this._states.pop();
                        }

                        this._states.push(this._state!);
                        this._stateIndex = this._states.length - 1;

                        this.saveState(true);
                    });
                }
            });
        } else {
            this._isSingleSlotted = false;
            
            if (this._getShowDebugInfo()) {
                Console.warn('Router is not configured (no route template provided) and cannot be used.');
            }
        }
    }

    /**
     * Go to a specific state.
     *
     * @param state state
     * @param partialState true - the new state is merged with the current state; false - the new state replaces the current state
     * @param removeHistory true - replace the current history entry; false - push a new history entry
     */
    public go(state?: {[key: string]: string | number | null | undefined} | string, partialState = true, removeHistory = false): void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        if (!this._stateChangeInProgress) {
            this.handleStateChange(state, partialState, () => {
                if (removeHistory) {
                    this._states = [this._state!];
                    this._stateIndex = 0;
                } else {
                    while (this._stateIndex < (this._states.length - 1)) {
                        this._states.pop();
                    }

                    this._states.push(this._state!);
                    this._stateIndex = this._states.length - 1;
                }

                this.saveState(removeHistory);
            }, false, true);
        } else {
            this._deferredStateChangeRequest = () => this.go(state, partialState, removeHistory);
        }
    }

    /**
     * Go to the previous state.
     */
    public goBack(): void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        if (!this._stateChangeInProgress) {
            if (this._stateIndex > 0) {
                this.handleStateChange(this._states[this._stateIndex - 1], false, () => {
                    this._stateIndex--;
                    history.back();
                });
            }
        } else {
            this._deferredStateChangeRequest = () => this.goBack();
        }
    }

    /**
     * Go to a specific state in history by offset.
     *
     * @param offset history offset
     */
    public goTo(offset: number): void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        if (!this._stateChangeInProgress) { 
            const index = this._stateIndex + offset!;
            if ((index >= 0) && (index < this._states.length)) {
                this.handleStateChange(this._states[index], false, () => {
                    this._stateIndex = index;
                    history.go(offset)
                });
            }
        } else {
            this._deferredStateChangeRequest = () => this.goTo(offset);
        }
    }

    /**
     * Go to the next state.
     */
    public goForward(): void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        if (!this._stateChangeInProgress) {
            if (this._stateIndex < (this._states.length - 1)) {
                this.handleStateChange(this._states[this._stateIndex + 1], false, () => {
                    this._stateIndex++;
                    history.forward();
                });
            }
        } else {
            this._deferredStateChangeRequest = () => this.goForward();
        }
    }

    /**
     * Subscribe to a BeforeStateChange event.
     *
     * @param callBack callback
     * @returns function to unsubscribe from the event
     */
    public onBeforeStateChange(callBack: (preventChange: () => void, oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void): () => void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        return this._onBeforeStateChangeCallBackEvent.subscribe(callBack);
    }

    /**
     * Subscribe to an AfterStateChange event.
     *
     * @param callBack callback
     * @returns function to unsubscribe from the event
     */
    public onAfterStateChange(callBack: (oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void): () => void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        return this._onAfterStateChangeCallBackEvent.subscribe(callBack);
    }

    private handleStateChange(stateData: {[key: string]: any} | string | null | undefined, partialState: boolean, saveState?: () => void,
                              preventStateChangeRollback: boolean = false, strictStateValidation: boolean = false): void {
        if (!this._stateChangeInProgress) {
            this._stateChangeInProgress = true;
            this._deferredStateChangeRequest = undefined;

            try {
                const previousState = this._state;
                const previousPath = this.path;

                const setStateResult = this.setState(stateData, partialState);
                if (setStateResult || !strictStateValidation) {
                    const newPath = this.getPath();
                    if (newPath !== previousPath) {
                        const newState = this.getState();
                    
                        let isStateChangeAllowed = true;

                        try {
                            this._onBeforeStateChangeCallBackEvent.raise(() => {
                                if (preventStateChangeRollback) {
                                    if (this._getShowDebugInfo()) {
                                        Console.warn('Router: current stage change is not preventable');
                                    }
                                } else {
                                    isStateChangeAllowed = false;
                                }
                            },
                            Object.assign(Object.create(null), previousState), Object.assign(Object.create(null), newState),
                            previousPath, newPath);
                        } catch(ex) {
                            Console.error(`Router: onBeforeStateChange call back execution error: ${ex}.`);
                        }

                        if (isStateChangeAllowed) {
                            this._state = newState;
                            this._path = newPath;

                            if (Helpers.isFunction(saveState)) {
                                saveState!();
                            }
                            
                            try {
                                this._onAfterStateChangeCallBackEvent.raise(Object.assign(Object.create(null), previousState), Object.assign(Object.create(null), newState),
                                                                            previousPath, newPath);
                            } catch(ex) {
                                Console.error(`Router: onAfterStateChange call back execution error: ${ex}.`);
                            }
                        } else {
                            //reset internal state to previous one of possible
                            if (!this.setState(previousState)) {
                                Console.error(`Router is not able roll-back to previous change, check route configuration`);
                            }
                        }
                    }
                } else {
                    //reset internal state to previous one of possible
                    if (!this.setState(previousState)) {
                        Console.error(`Router is not able roll-back to previous change, check route configuration`);
                    }
                }
            } finally {
                this._stateChangeInProgress = false;
            }

            if (Helpers.isFunction(this._deferredStateChangeRequest)) {
                const deferredHandleStateChange = this._deferredStateChangeRequest!;
                this._deferredStateChangeRequest = undefined;
                deferredHandleStateChange();
            }
        }
    }

    private setState(stateData: {[key: string]: any} | string | null | undefined, partialState: boolean = true): boolean {
        let result = true;

        if (Helpers.isObject(stateData) || (Helpers.isString(stateData) && (stateData!.trim().length > 0))) {
            let expectedStateData: {[key: string]: any};

            if (Helpers.isObject(stateData)) {
                expectedStateData = <{[key: string]: any}>stateData;
            } else {
                if (!this._isSingleSlotted) {
                    result = false;
                    Console.error('Router single slot state change cannot be used when there are more than one slot.');
                    return result;
                }

                expectedStateData = Object.create(null);
                expectedStateData[this._routeSlots![0].name!] = (<string>stateData).trim();
            }

            if (partialState) {
                for (const key of Object.getOwnPropertyNames(expectedStateData)) {
                    const slot = this._routeObj![key];
                    if (Helpers.isObject(slot)) {
                        result = slot.setValue(expectedStateData[key]) && result;
                    } else {
                        result = false;
                        Console.warn(`Router is not able to find matching slot for '${key}' key.`);
                    }
                }
            } else {
                for (const slot of this._routeSlots!) {
                    if (Helpers.isString(slot.name)) {
                        result = slot.setValue(expectedStateData[slot.name!]) && result;
                    }
                }
            }
        } else {
            for (const slot of this._routeSlots!) {
                slot.resetValue();
            }
        }

        return result;
    }

    private getPath(): string {
        const path: Array<string> = [];
        const query: Array<[string, string]> = [];

        let queryInUse = false;
        for (let index = 0 ; index < this._routeSlots!.length; index++) {
            const slot = this._routeSlots![index];
            if (Helpers.isString(slot.value)) {
                if (queryInUse || ((index > 0) && !Helpers.isString(this._routeSlots![index - 1].value))) {
                    queryInUse = true;

                    if (Helpers.isString(slot.name)) {
                        query.push([slot.name!, encodeURIComponent(slot.value!)]);
                    }
                } else {
                    path.push(encodeURIComponent(slot.value!));
                }
            }
        }
        
        return (path.length > 0 ? `/${path.join('/')}` : (query.length > 0 ? '/' : '')) + 
               (query.length > 0 ? `?${query.map(el => `${el[0]}=${el[1]}`).join('&')}` : '');
    }

    private getState(): {[key: string]: string | undefined} {
        const state = Object.create(null);

        for (const key of Object.getOwnPropertyNames(this._routeObj)) {
            state[key] = this._routeObj![key].value;
        }

        return state;
    }

    private getStatePath(): string {
        const pathIsEmpty = this.path!.length == 0;

        return this._hashBased
                    ? (pathIsEmpty
                            ? this._documentPath!
                            : `${this._documentPath!}#${this.path!}`)
                    : (pathIsEmpty
                            ? '/'
                            : this.path!);
    }

    private saveState(removeHistory: boolean): void {
        if (removeHistory) {
            history.replaceState(this._state, '', this.getStatePath());
        } else {
            history.pushState(this._state, '', this.getStatePath());
        }
    }

    //route processing
    private getStateFromRoute(): {[key: string]: string} {
        const routeState = Object.create(null);

        let locationPathName = '';
        let locationSearch = '';

        if (this._hashBased) {
            let locationHash = location.hash.trim();
            if (locationHash.length > 0) {
                if (locationHash.startsWith('#')) {
                    locationHash = locationHash.substring(1).trim();
                }

                if (locationHash.length > 0) {
                    const splittedLocationHash = locationHash.split('?');
                    locationPathName = splittedLocationHash[0].trim();
                    locationSearch = splittedLocationHash.length > 1 ? splittedLocationHash[1].trim() : '';
                }
            }
        } else {
            locationPathName = location.pathname.trim();
            locationSearch = location.search.trim();
        }

        if (locationPathName.length > 1) {
            if (locationPathName.startsWith('/')) {
                locationPathName = locationPathName.substring(1).trim();
            }

            if (locationPathName.endsWith('/')) {
                locationPathName = locationPathName.substring(0, locationPathName.length - 1).trim();
            }

            if (locationPathName.length > 0) {
                const splittedLocationPathName = locationPathName.split('/');
                if (splittedLocationPathName.length > 0) {
                    for (let index = 0; index < Math.min(splittedLocationPathName.length, this._routeSlots!.length); index++) {
                        const rawUrlSlotValue = splittedLocationPathName[index];
                        const slot = this._routeSlots![index];

                        try {
                            const urlSlotValue = decodeURIComponent(rawUrlSlotValue);
                            
                            if (Helpers.isString(slot.name)) { //component or variable
                                routeState[slot.name!] = urlSlotValue;
                            } else { //constant
                                if (this._getShowDebugInfo() && (urlSlotValue.toLowerCase() !== slot.value!.toLowerCase())) {
                                    Console.warn(`Router: URL segment ${index + 1} is '${urlSlotValue}', expected constant '${slot.value}'`);
                                }
                            }
                        } catch (ex) {
                            Console.error(`Router is not able to decodeURIComponent '${rawUrlSlotValue}', exception: ${ex}`);
                        }
                    }
                }   
            }
        }
        
        if (locationSearch.length > 2) {
            if (locationSearch.startsWith('?')) {
                locationSearch = locationSearch.substring(1).trim();
            }

            if (locationSearch.length > 2) {
                const splittedLocationSearch = locationSearch.split('&').map(el => {
                    const splitIndex = el.indexOf('=');
                    return [el.substring(0, splitIndex), splitIndex > 0 ? el.substring(splitIndex + 1) : ''];
                });
                if (splittedLocationSearch.length > 0) {
                    for (const [key, value] of splittedLocationSearch) {
                        const keyIndex = this._routeSlotNames!.findIndex(el => el.toLowerCase() == key.toLowerCase());
                        if (keyIndex >= 0) {
                            try {
                                routeState[this._routeSlotNames![keyIndex]] = decodeURIComponent(value);
                            } catch (ex) {
                                Console.error(`Router is not able to decodeURIComponent '${value}', exception: ${ex}`);
                            }
                        }
                    }
                }
            }
        }

        return routeState;
    }
}