export abstract class BasedEntity<T> {
    protected readonly data = new Map<string, T>();

    public has(name: string): boolean {
        return this.data.has(name.toLowerCase());
    }
}