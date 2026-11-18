import { Base } from './Base';

import { Constants } from '../../../Constants';

export class InitializableBase extends Base {
    private isReady: boolean = false;

    protected readonly nativeElement: Element | undefined;
    protected readonly handlerAttributeName: string | undefined;

    constructor (nativeElement?: Element, handlerAttributeName?: string) {
        super();

        this.nativeElement = nativeElement;
        this.handlerAttributeName = handlerAttributeName;
    }

    protected markAsReady(): void {
        if (!this.isReady) {
            this.isReady = true;
            this.nativeElement!.setAttribute(Constants.HANDLERS.getReadyAttributeName(this.handlerAttributeName!), '');
        }
    }
}