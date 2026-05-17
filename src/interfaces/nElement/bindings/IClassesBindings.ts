export interface IClassesBindings<T> {
    readonly type: 'simple' | 'array' | 'condition';
    readonly rawExpression: T;
}