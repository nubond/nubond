import { Helpers } from '../Helpers';
import { Environment } from '../Environment';
export class StylesInitializer {
    private static _initTimeout: number | null | undefined;

    private constructor() { }
    
    public static init(): void {
        if (Helpers.isNumber(this._initTimeout)) {
            clearTimeout(this._initTimeout!);
            this._initTimeout = undefined;
        }

        if (!Helpers.isUndefined(document)) {           
            document.adoptedStyleSheets.push(Environment.adoptedStyles.processingHideCSSStyleSheet);
            document.adoptedStyleSheets.push(Environment.adoptedStyles.hideCSSStyleSheet);
        } else {
            this._initTimeout = setTimeout(() => this.init());
        }
    }
}