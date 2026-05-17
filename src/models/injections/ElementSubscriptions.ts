/**
* Injection class for subscribing to events on the entity's root HTML element.
* Available in classes decorated with: Component and Aspect.
*/
export class ElementSubscriptions {
    private readonly _isSubscribed: <K extends keyof HTMLElementEventMap>(eventName: K | string) => boolean;
    private readonly _isUnSubscribed: <K extends keyof HTMLElementEventMap>(eventName: K | string) => boolean;
    private readonly _subscribe: <K extends keyof HTMLElementEventMap>(eventName: K | string, callBack: (evt: HTMLElementEventMap[K] | Event) => any, optionsOrDebounce?: boolean | AddEventListenerOptions | number, debounce?: number) => () => void;

    constructor (isSubscribed: <K extends keyof HTMLElementEventMap>(eventName: K | string) => boolean,
                 isUnSubscribed: <K extends keyof HTMLElementEventMap>(eventName: K | string) => boolean, 
                 subscribe: <K extends keyof HTMLElementEventMap>(eventName: K | string, callBack: (evt: HTMLElementEventMap[K] | Event) => any, optionsOrDebounce?: boolean | AddEventListenerOptions | number, debounce?: number) => () => void) {
        this._isSubscribed = isSubscribed;
        this._isUnSubscribed = isUnSubscribed;
        this._subscribe = subscribe;
    }

    /**
     * Check whether the subscription to an event is active.
     *
     * @param eventName event name
     * @returns true - subscribed to the event; false - otherwise
     */
    public isSubscribed<K extends keyof HTMLElementEventMap>(eventName: K): boolean;
    /**
     * Check whether the subscription to an event is active.
     *
     * @param eventName event name
     * @returns true - subscribed to the event; false - otherwise
     */
    public isSubscribed(eventName: string): boolean;
    public isSubscribed<K extends keyof HTMLElementEventMap>(eventName: K | string): boolean {
        return this._isSubscribed(eventName);
    }

    /**
     * Check whether the event has been unsubscribed from.
     *
     * @param eventName event name
     * @returns true - unsubscribed from the event; false - otherwise
     */
    public isUnSubscribed<K extends keyof HTMLElementEventMap>(eventName: K): boolean;
    /**
     * Check whether the event has been unsubscribed from.
     *
     * @param eventName event name
     * @returns true - unsubscribed from the event; false - otherwise
     */
    public isUnSubscribed(eventName: string): boolean;
    public isUnSubscribed<K extends keyof HTMLElementEventMap>(eventName: K | string): boolean {
        return this._isUnSubscribed(eventName);
    }

    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe<K extends keyof HTMLElementEventMap>(eventName: K, callBack: (evt: HTMLElementEventMap[K]) => any): () => void;
    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @param options subscription options
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe<K extends keyof HTMLElementEventMap>(eventName: K, callBack: (evt: HTMLElementEventMap[K]) => any, options: boolean | AddEventListenerOptions): () => void;
    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @param options subscription options
     * @param debounce debounce in milliseconds
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe<K extends keyof HTMLElementEventMap>(eventName: K, callBack: (evt: HTMLElementEventMap[K]) => any, options: boolean | AddEventListenerOptions, debounce: number): () => void;
    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @param debounce debounce in milliseconds
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe<K extends keyof HTMLElementEventMap>(eventName: K, callBack: (evt: HTMLElementEventMap[K]) => any, debounce: number): () => void;
    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe(eventName: string, callBack: (evt: Event) => any): () => void;
    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @param options subscription options
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe(eventName: string, callBack: (evt: Event) => any, options: boolean | AddEventListenerOptions): () => void;
    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @param options subscription options
     * @param debounce debounce in milliseconds
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe(eventName: string, callBack: (evt: Event) => any, options: boolean | AddEventListenerOptions, debounce: number): () => void;
    /**
     * Subscribe to an event on the root HTML element of a Component or Aspect.
     * Internally calls `addEventListener`.
     * Does not trigger change detection automatically.
     *
     * [subscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
     * [unsubscribe MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
     *
     * @param eventName event name
     * @param callBack event callback
     * @param debounce debounce in milliseconds
     * @returns function to unsubscribe from the event (internally calls `removeEventListener`)
     */
    public subscribe(eventName: string, callBack: (evt: Event) => any, debounce: number): () => void;
    public subscribe<K extends keyof HTMLElementEventMap>(eventName: K | string, callBack: (evt: HTMLElementEventMap[K] | Event) => any, optionsOrDebounce?: boolean | AddEventListenerOptions | number, debounce?: number): () => void {
        return this._subscribe(eventName, callBack, optionsOrDebounce, debounce);
    }
}