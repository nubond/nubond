export interface ICommittable {
    readonly isDirty: boolean;

    commit(): boolean;
}