/**
* AppRoot and Container context config.
*/
export interface IContextConfig {
    /**
    * Whether the current context's change-detection strategy is pessimistic.
    */
    pessimisticChangeDetectionStrategy?: boolean;
    /**
    * Context HTML sanitizer.
    *
    * @param html raw HTML
    * @returns sanitized HTML
    */
    htmlSanitizer?: (html: string) => string;
}