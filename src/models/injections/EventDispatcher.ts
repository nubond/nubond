import { Helpers } from '../../Helpers';

/**
* Injection class for dispatching events on the entity's root HTML element.
* Available in classes decorated with: Container, Component, Aspect and AppRoot.
*/
export class EventDispatcher {
    private readonly _nativeElement: Element;

    constructor(nativeElement: Element) {
        this._nativeElement = nativeElement;
    }

    /**
     * Dispatch an Event, synchronously invoking the affected event listeners in the appropriate order.
     * The normal event-processing rules (including capturing and the optional bubbling phase) apply just as they would to events dispatched manually with `dispatchEvent`.
     * The event is dispatched on the root HTML element of the Container, Component, Aspect or AppRoot into which EventDispatcher was injected.
     *
     * [MDN reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)
     *
     * @param event the Event object to dispatch - its `Event.target` will be set to the current EventTarget
     * @returns false if the event is cancelable and at least one of the receiving handlers called `Event.preventDefault()`; otherwise true
     */
    public dispatch<T extends Event>(event: T): boolean;
    /**
     * Dispatch a CustomEvent, synchronously invoking the affected event listeners in the appropriate order.
     * The normal event-processing rules (including capturing and the optional bubbling phase) apply just as they would to events dispatched manually with `dispatchEvent`.
     * The event is dispatched on the root HTML element of the Container, Component, Aspect or AppRoot into which EventDispatcher was injected.
     *
     * [MDN reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)
     *
     * @param name CustomEvent name
     * @param data CustomEvent detail data
     * @returns false if the event is cancelable and at least one of the receiving handlers called `Event.preventDefault()`; otherwise true
     */
    public dispatch(name: string, data?: any): boolean;
    public dispatch(nameOrEvent: string | Event, data?: any): boolean {
        return this._nativeElement.dispatchEvent(Helpers.isString(nameOrEvent) 
                                                        ? new CustomEvent(<string>nameOrEvent, Helpers.isUndefined(data) ? data : { detail: data }) 
                                                        : <Event>nameOrEvent);
    }
}