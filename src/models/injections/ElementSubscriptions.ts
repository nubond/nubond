/**
* Injection class for subscribing to events on the entity's root HTML element.
* Available in classes decorated with: Component and Aspect.
*/
export class ElementSubscriptions {
    private readonly _subscribe: <K extends keyof HTMLElementEventMap>(eventName: K | string, callBack: (evt: HTMLElementEventMap[K] | Event) => any, optionsOrDebounce?: boolean | AddEventListenerOptions | number, debounce?: number) => () => void;

    constructor (subscribe: <K extends keyof HTMLElementEventMap>(eventName: K | string, callBack: (evt: HTMLElementEventMap[K] | Event) => any, optionsOrDebounce?: boolean | AddEventListenerOptions | number, debounce?: number) => () => void) {
        this._subscribe = subscribe;
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