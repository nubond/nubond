import { Helpers } from './Helpers';
import { Constants } from './Constants';

export class Console {
    public static readonly isAvailable = Helpers.isObject(console);
    public static readonly isErrorAvailable = this.isAvailable && Helpers.isFunction(console.error);
    public static readonly isWarnAvailable = this.isAvailable && Helpers.isFunction(console.warn);
    public static readonly isInfoAvailable = this.isAvailable && Helpers.isFunction(console.info);

    private constructor() {}
    
    public static error(...data: any[]) {
        if (this.isErrorAvailable) {
            console.error(`${Constants.DISPLAY_NAME}: `, ...data);
        }
    }

    public static warn(...data: any[]) {
        if (this.isWarnAvailable) {
            console.warn(`${Constants.DISPLAY_NAME}: `, ...data);
        }
    }

    public static info(...data: any[]) {
        if (this.isInfoAvailable) {
            console.info(`${Constants.DISPLAY_NAME}: `, ...data);
        }
    }
}