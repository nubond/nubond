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

    public setValue(value: any): void {
        if (this._value !== value) {
            if (this._slotType != 'constant') {
                if (Helpers.isUndefined(value) || (value === null) || (Helpers.isString(value) && (<string>value).trim().length == 0)) {
                    this.resetValue();
                } else {
                    const stringifiedValue = (Helpers.isString(value) ? (<string>value) : Helpers.stringify(value)).trim();
                    if ((this._slotType == 'component') && (stringifiedValue.length > 0) && !this._isContainerExists(stringifiedValue)) {
                        Console.error(`Router: container '${stringifiedValue}' not found, can't route.`);
                        return;
                    }

                    this._value = stringifiedValue;
                }
            }
        }
    }

    public resetValue(): void {
        this._value = this._defaultValue;
    }
}

/**
* State-based router.
*/
export class Router {
    private readonly _getShowDebugInfo: () => boolean;

    private readonly _routeSlots: Array<RouteSlot> | undefined;
    private readonly _routeObj: {[key: string]: RouteSlot} | undefined;
    private readonly _isSingleSlotted: boolean;

    private readonly _onBeforeStateChangeCallBackEvent = new CallBackEvent<(preventChange: () => void, oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void>();
    private readonly _onAfterStateChangeCallBackEvent = new CallBackEvent<(oldState: Readonly<{[key: string]: string | undefined}>, newState: Readonly<{[key: string]: string | undefined}>, oldPath: string, newPath: string) => void>();

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

    private _state: {[key: string]: string | undefined} | undefined;
    //current state
    public get state(): {[key: string]: string | undefined} | undefined {
        return this._state;
    }

    constructor(routeConfig: string | undefined, isContainerExists: (containerName: string) => boolean, getShowDebugInfo: () => boolean) {
        this._getShowDebugInfo = getShowDebugInfo;
        
        if (Helpers.isNotEmptyString(routeConfig)) {
            this._isConfigured = true;

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

            this._isSingleSlotted = (this._routeSlots.length == 1) && Helpers.isNotEmptyString(this._routeSlots[0].name);

            const slotNames: Array<string> = [];

            for (const slot of this._routeSlots) {
                if (Helpers.isString(slot.name)) {
                    this._routeObj![slot.name!] = slot;
                    slotNames.push(slot.name!);
                }
            }

            //update current state based on URL
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
                        for (let index = 0; index < Math.min(splittedLocationPathName.length, this._routeSlots.length); index++) {
                            const slot = this._routeSlots[index];
                            if (Helpers.isString(slot.name)) {
                                const value = splittedLocationPathName[index];
                                try {
                                    routeState[slot.name!] = decodeURIComponent(value);
                                } catch (ex) {
                                    Console.error(`Router is not able to decodeURIComponent '${value}', exception: ${ex}`);
                                }
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
                            const keyIndex = slotNames.findIndex(el => el.toLowerCase() == key.toLowerCase());
                            if (keyIndex >= 0) {
                                try {
                                    routeState[slotNames[keyIndex]] = decodeURIComponent(value);
                                } catch (ex) {
                                    Console.error(`Router is not able to decodeURIComponent '${value}', exception: ${ex}`);
                                }
                            }
                        }
                    }
                }
            }

            if (Object.getOwnPropertyNames(routeState).length > 0) {
                this.handleStateChange(routeState, true, () => this.saveState(true));
            } else {
                if (this._routeSlots.some(el => Helpers.isString(el.name) && Helpers.isString(el.value))) {
                    this.go(undefined, true, true);
                } else {
                    this.handleStateChange(null, false, () => this.saveState(true));
                }
            }

            //will double trigger this.handleStateChange on going to specific path with public methods
            addEventListener('popstate', event => {
                const newState = event.state;
                if (Helpers.isObject(newState)) {
                    const newStateKeys = Object.getOwnPropertyNames(newState);
                    let stateFound = false;

                    for (let index = 0; index < this._states.length; index++) {
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
                                this._stateIndex = index;
                                this.handleStateChange(newState, false, () => {});
                                break;
                            }
                        }
                    }

                    if (!stateFound) {
                        this.handleStateChange(newState, false, () => {
                            this._states.push(this.state!);
                            this._stateIndex = this._states.length - 1;
                            history.pushState(this.state, '', this.path!.length == 0 
                                                                    ? '/' 
                                                                    : ((this._hashBased ? '/#' : '') + this.path));
                        });
                    }
                } else {
                    this.handleStateChange(null, false);
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

        this.handleStateChange(state, partialState, () => {
            if (removeHistory) {
                this._states = [this.state!];
                this._stateIndex = 0;
            } else {
                while (this._stateIndex < (this._states.length - 1)) {
                    this._states.pop();
                }

                this._states.push(this.state!);
                this._stateIndex = this._states.length - 1;
            }

            this.saveState(removeHistory);
        });
    }

    /**
     * Go to the previous state.
     */
    public goBack(): void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        if (this._stateIndex > 0) {
            this.handleStateChange(this._states[this._stateIndex - 1], false, () => {
                this._stateIndex--;
                history.back();
            });
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

        const index = this._stateIndex + offset!;
        if ((index >= 0) && (index < this._states.length)) {
            this.handleStateChange(this._states[index], false, () => {
                this._stateIndex = index;
                history.go(offset)
            });
        }
    }

    /**
     * Go to the next state.
     */
    public goForward(): void {
        if (!this._isConfigured) {
            throw new Error(`${Constants.DISPLAY_NAME}: Router is not configured and cannot be used.`);
        }

        if (this._stateIndex < (this._states.length - 1)) {
            this.handleStateChange(this._states[this._stateIndex + 1], false, () => {
                this._stateIndex++;
                history.forward();
            });
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

    private handleStateChange(stateData: {[key: string]: any} | string | null | undefined, partialState: boolean, saveState?: () => void): void {
        const previousPath = this.path;

        this.setState(stateData, partialState);
        
        const newPath = this.getPath();
        if (newPath !== previousPath) {
            const previousState = this.state;
            const newState = this.getState();
        
            let isStateChangeAllowed = true;

            try {
                this._onBeforeStateChangeCallBackEvent.raise(() => isStateChangeAllowed = false, 
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
                //reset internal state to previous one
                this.setState(previousState, true);
            }
        }
    }

    private setState(stateData: {[key: string]: any} | string | null | undefined, partialState: boolean): void {
        if (Helpers.isObject(stateData) || (Helpers.isString(stateData) && (stateData!.trim().length > 0))) {
            let expectedStateData: {[key: string]: any};

            if (Helpers.isObject(stateData)) {
                expectedStateData = <{[key: string]: any}>stateData;
            } else {
                if (!this._isSingleSlotted) {
                    Console.error('Router single slot state change cannot be used when there are more then one slot.');
                    return;
                }

                expectedStateData = Object.create(null);
                expectedStateData[this._routeSlots![0].name!] = (<string>stateData).trim();
            }

            if (partialState) {
                for (const key of Object.getOwnPropertyNames(expectedStateData)) {
                    const slot = this._routeObj![key];
                    if (Helpers.isObject(slot)) {
                        slot.setValue(expectedStateData[key]);
                    } else {
                        if (this._getShowDebugInfo()) {
                            Console.warn(`Router is not able to find matching slot for '${key}' key.`);
                        }
                    }
                }
            } else {
                for (const slot of this._routeSlots!) {
                    if (Helpers.isString(slot.name)) {
                        slot.setValue(expectedStateData[slot.name!]);
                    }
                }
            }
        } else {
            for (const slot of this._routeSlots!) {
                slot.resetValue();
            }
        }
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

    private saveState(removeHistory: boolean): void {
        const statePath = this.path!.length == 0 
                                    ? '/' 
                                    : ((this._hashBased ? '/#' : '') + this.path);
        if (removeHistory) {
            history.replaceState(this.state, '', statePath);
        } else {
            history.pushState(this.state, '', statePath);
        }
    }
}