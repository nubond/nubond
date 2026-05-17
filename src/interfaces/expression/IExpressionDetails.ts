export interface IExpressionDetails {
    readonly expression: string;
    readonly isSingleBinded: boolean;
}

export interface IExpressionPreviousValue<T> {
    previousValue: T | undefined
}