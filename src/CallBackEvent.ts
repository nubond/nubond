/**
* Typed TypeScript events backed by callbacks.
*/
export class CallBackEvent<T extends Function> {
    private readonly _callBacks: Array<T> = [];

    /**
    * Subscribe to the event.
    *
    * @param callBack event callback
    * @returns function to unsubscribe from the event
    */
    public subscribe(callBack: T): () => void {
        if (this._callBacks.indexOf(callBack) < 0) {
            this._callBacks.push(callBack);
        }

        const that = this;
        return function (): void {
            const expectedFnIndex = that._callBacks.indexOf(callBack);
            if (expectedFnIndex >= 0) {
                that._callBacks.splice(expectedFnIndex, 1);
            }
        };
    }

    /**
    * Raise the event.
    *
    * @param data data passed to each subscribed callback
    */
    public raise(...data: Array<any>): void {
        const erroredCallbacks: Array<string> = [];

        for (const callBack of this._callBacks.slice()) {
            try {
                callBack(...data);
            } catch (ex) {
                erroredCallbacks.push(`callback (${callBack}) failed with exception: ${ex}`);
            }
        }

        if (erroredCallbacks.length > 0) {
            throw new Error(`one or more callbacks failed: ${erroredCallbacks.join(',')}`);
        }
    }
}