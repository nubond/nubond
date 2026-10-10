export interface IVisibilityHandler {
    show(requestingHandlerName: string): void;
    hide(requestingHandlerName: string): void
}