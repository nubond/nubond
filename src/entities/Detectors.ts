export class Detectors {
    private _data = new Map<Object, Set<string>>();

    public has(target: ObjectConstructor): boolean {
        return this._data.has(target.prototype);
    }

    public get(target: ObjectConstructor): ReadonlySet<string> | undefined {
        return this._data.get(target.prototype);
    }
    
    public add(targetPrototype: Object, propName: string): void {
        if (this._data.has(targetPrototype)) {
            this._data.get(targetPrototype)!.add(propName);
        } else {
            this._data.set(targetPrototype, new Set<string>([propName]));
        }
    }
}