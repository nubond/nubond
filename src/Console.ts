import { Constants } from './Constants';

export class Console {
    public static readonly isAvailable = (typeof(console) === 'object') && (console !== null);
    public static readonly isErrorAvailable = this.isAvailable && (typeof(console.error) === 'function');
    public static readonly isWarnAvailable = this.isAvailable && (typeof(console.warn) === 'function');
    public static readonly isInfoAvailable = this.isAvailable && (typeof(console.info) === 'function');

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