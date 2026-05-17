import { Helpers } from "../Helpers";

export class Eventers {
    private _data = new Map<Object, Map<string, string>>();

    public has(target: ObjectConstructor): boolean {
        return this._data.has(target.prototype);
    }

    public get(target: ObjectConstructor): Map<string, string> | undefined {
        return this._data.get(target.prototype);
    }
    
    public add(targetPrototype: Object, eventName: string, propertyName: string): void {
        let map = this._data.get(targetPrototype);

        if (Helpers.isUndefined(map)) {
            map = new Map<string, string>();
            this._data.set(targetPrototype, map);
        }
        
        map!.set(propertyName, eventName);
    }
}