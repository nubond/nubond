import { ICommittable } from './ICommittable';
import { IBindable } from './IBindable';

export interface IHandler<T> extends ICommittable, IBindable {
    readonly nExpression: T | undefined;
    readonly hasNExpression: boolean;
}