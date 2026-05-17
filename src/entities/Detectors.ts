export class Detectors {
    private _data = new Map<Object, Array<string>>();

    public has(target: ObjectConstructor): boolean {
        return this._data.has(target.prototype);
    }

    public get(target: ObjectConstructor): Array<string> | undefined {
        return this._data.get(target.prototype);
    }
    
    public add(targetPrototype: Object, propName: string): void {
        if (this._data.has(targetPrototype)) {
            this._data.get(targetPrototype)!.push(propName);
        } else {
            this._data.set(targetPrototype, [propName]);
        }
    }
}