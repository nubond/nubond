/**
* Component ShadowRoot config.
*
* [MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow)
*/
export interface IShadowRootConfig {
    /**
    * When true, mitigates custom-element focusability issues.
    * If a non-focusable part of the shadow DOM is clicked, the first focusable part receives focus, and the shadow host receives any available `:focus` styling.
    * Default: false.
    */
    delegatesFocus?: boolean;
    /**
    * Encapsulation mode for the shadow DOM tree. One of:
    * * `open` - elements of the shadow root are accessible from JavaScript outside the root
    * * `closed` - denies access to the nodes of a closed shadow root from JavaScript outside it
    */
    mode: ShadowRootMode;
    /**
    * When true, indicates that the shadow root is serializable.
    * If set, the shadow root can be serialized via `Element.getHTML()` or `ShadowRoot.getHTML()` when `options.serializableShadowRoots` is true.
    * Default: false.
    */
    serializable?: boolean;
}