import { Helpers } from "../Helpers";

export class ReflectInitializer {
    private static readonly META_DATA = new Map<any, Map<symbol, Map<any, any>>>();
    private static _initTimeout: number | null | undefined;

    private constructor() { }
    
    public static init() {
        if (Helpers.isNumber(this._initTimeout)) {
            clearTimeout(this._initTimeout!);
            this._initTimeout = undefined;
        }

        if (!Helpers.isUndefined(document)) {
            const that = this;

            if (!Helpers.isFunction((<any>Reflect).getMetadata)) {
                Object.defineProperty(Reflect, 'getMetadata', {
                    value: function (metadataKey: any, target: any, propertyKey?: string | symbol): any {
                        const targetMetaData = that.META_DATA.get(target);
                        if (!Helpers.isUndefined(targetMetaData)) {
                            const targetPropertyKeyMetaData = targetMetaData!.get(Helpers.isSymbol(propertyKey)
                                                                                        ? <symbol>propertyKey
                                                                                        : (Helpers.isString(propertyKey)
                                                                                                ? Symbol.for(<string>propertyKey)
                                                                                                : Symbol.for('')));
                            if (!Helpers.isUndefined(targetPropertyKeyMetaData)) {
                                return targetPropertyKeyMetaData!.get(metadataKey);
                            }
                        }
                    },
                    configurable: true, 
                    writable: true
                });
            }

            if (!Helpers.isFunction((<any>Reflect).metadata)) {
                Object.defineProperty(Reflect, 'metadata', {
                    value: function (metadataKey: any, metadataValue: any): (target: any, propertyKey?: string | symbol) => void {
                        return function (target: any, propertyKey?: string | symbol) {
                            const propertyKeySymbol = Helpers.isSymbol(propertyKey)
                                                                ? <symbol>propertyKey
                                                                : (Helpers.isString(propertyKey)
                                                                        ? Symbol.for(<string>propertyKey)
                                                                        : Symbol.for(''));

                            let targetMetaData: Map<symbol, Map<any, any>> | undefined;
                            if (that.META_DATA.has(target)) {
                                targetMetaData = that.META_DATA.get(target);
                            } else {
                                targetMetaData = new Map<symbol, Map<any, any>>();
                                that.META_DATA.set(target, targetMetaData);
                            }

                            let targetPropertyKeyMetaData: Map<any, any> | undefined;
                            if (targetMetaData!.has(propertyKeySymbol)) {
                                targetPropertyKeyMetaData = targetMetaData!.get(propertyKeySymbol);
                            } else {
                                targetPropertyKeyMetaData = new Map<any, any>();
                                targetMetaData!.set(propertyKeySymbol, targetPropertyKeyMetaData);
                            }

                            targetPropertyKeyMetaData!.set(metadataKey, metadataValue);
                        };
                    },
                    configurable: true, 
                    writable: true
                });
            }

            // if (!Helpers.isFunction((<any>Reflect).META_DATA)) {
            //     Object.defineProperty(Reflect, 'META_DATA', {
            //         value: that.META_DATA,
            //         configurable: true, 
            //         writable: true
            //     });
            // }
        } else {
            this._initTimeout = setTimeout(() => this.init());
        }
    }
}