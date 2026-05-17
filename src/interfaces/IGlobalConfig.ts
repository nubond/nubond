import { IShadowRootConfig } from './IShadowRootConfig';

/**
* Global config.
*/
export interface IGlobalConfig {
    /**
    * Whether to show debug info.
    */
    showDebugInfo?: boolean;
    /**
    * Whether to comply with W3C.
    * * false - handlers look like:
    * * * nb-attr:disabled="this.disabled"
    * * true - handlers look like:
    * * * data-nb-attr--disabled="this.disabled"
    */
    complyWithW3C?: boolean;
    /**
    * Whether the default context change-detection strategy is pessimistic.
    */
    pessimisticChangeDetectionStrategy?: boolean;
    /**
    * Default ShadowRoot config.
    */
    shadowRootConfig?: IShadowRootConfig;

    /**
    * Default HTML sanitizer.
    *
    * @param html raw HTML
    * @returns sanitized HTML
    */
    htmlSanitizer?: (html: string) => string;
    /**
    * Default style sanitizer.
    *
    * @param style raw style
    * @returns sanitized style
    */
    styleSanitizer?: (style: string) => string;
}