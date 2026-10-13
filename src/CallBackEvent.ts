/**
* Typed TypeScript events backed by callbacks.
*/
export class CallBackEvent<T extends Function> {
    private readonly _callBacks = new Set<T>();

    /**
    * Subscribe to the event.
    *
    * @param callBack event callback
    * @returns function to unsubscribe from the event
    */
    public subscribe(callBack: T): () => void {
        this._callBacks.add(callBack);

        const callBacks = this._callBacks;
        return function (): void {
            callBacks.delete(callBack);
        };
    }

    /**
    * Raise the event.
    *
    * @param data data passed to each subscribed callback
    */
    public raise(...data: Array<any>): void {
        if (this._callBacks.size > 0) {
            const erroredCallbacks: Array<string> = [];

            for (const callBack of Array.from(this._callBacks)) {
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
}