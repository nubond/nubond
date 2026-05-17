/**
* Injection class for requesting change detection on the current context.
* Available in classes decorated with: Container, Component and AppRoot.
*/
export class ChangeDetector {
    private readonly _detect: () => void;

    constructor (detectChanges: () => void) {
        this._detect = detectChanges;
    }

    /**
    * Request change detection on the current context.
    * Debounced - safe to call multiple times in a row.
    */
    public detect(): void {
        this._detect();
    }
}