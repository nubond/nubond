/**
* Template provider.
*/
export interface ITemplateProvider {
    /**
    * Get the template.
    *
    * @returns the template (synchronously) or a Promise that resolves to it (asynchronously)
    */
    get(): string | Promise<string>;
}