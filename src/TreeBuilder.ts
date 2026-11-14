import { INElement, INTreeElement } from './interfaces/nElement/INElement';
import { IContextBinder } from './interfaces/contextBinders/IContextBinder';

import { NElement, NTreeElement } from './nElement/NElement';
import { NElementProjection } from './nElement/NElementProjection';

export class TreeBuilder {
    private constructor() {}

    public static constructTree(contextBinder: IContextBinder, nativeElement: Element | ShadowRoot, bindRootElement: boolean): INTreeElement {
        const newNElement = bindRootElement
                                ? (nativeElement instanceof ShadowRoot 
                                            ? this.createNElement(contextBinder, null, (<ShadowRoot>nativeElement).host)
                                            : this.createNElement(contextBinder, null, nativeElement))
                                : (nativeElement instanceof ShadowRoot 
                                            ? this.createNTreeElement((<ShadowRoot>nativeElement).host)
                                            : this.createNTreeElement(nativeElement));

        this.constructTreePrivate(contextBinder, newNElement, nativeElement);

        return newNElement;
    }

    private static constructTreePrivate(contextBinder: IContextBinder, nTreeElementParent: INElement | INTreeElement, nativeElement: ParentNode): void {
        let child = nativeElement.firstElementChild;

        while(child !== null) {
            const isApplicableNElement = NElement.isNApplicable(child);
            const isApplicableNElementProjection = NElementProjection.isProjection(child);

            if (isApplicableNElement || isApplicableNElementProjection) {
                let newNElementContextBinder: IContextBinder;
                let newNElementNTreeElementParent: INTreeElement;
                let immediateParent: INElement | undefined;

                if (isApplicableNElementProjection && 
                    (contextBinder.parent !== null) && (contextBinder.parentNElement !== null) && 
                    NElementProjection.isEncapsulatedProjection(child)) {
                    newNElementContextBinder = contextBinder.parent!;
                    newNElementNTreeElementParent = contextBinder.parentNElement!;
                    immediateParent = <INElement>nTreeElementParent;
                } else {
                    newNElementContextBinder = contextBinder;
                    newNElementNTreeElementParent = nTreeElementParent;
                }

                const newNElement = this.createNElement(newNElementContextBinder, newNElementNTreeElementParent, child, undefined, immediateParent);

                newNElementNTreeElementParent.addChild(newNElement);

                if (!newNElement.isSubTreeHandled) {
                    this.constructTreePrivate(newNElementContextBinder, newNElement, child);
                }
            } else {
                this.constructTreePrivate(contextBinder, nTreeElementParent, child);
            }

            child = child.nextElementSibling;
        }
    }

    private static cloneTree(contextBinder: IContextBinder, nTreeElementParent: INElement | INTreeElement, nElement: INElement): void {
        const newElement = <Element>nElement.nativeElementForClone!.cloneNode(true);
        nElement.nativeElement.insertAdjacentElement('afterend', newElement);
        
        const newNElement = this.createNElement(contextBinder, nTreeElementParent, newElement, nElement);

        nTreeElementParent.addChild(newNElement);

        if (!newNElement.isSubTreeHandled) {
            this.constructTreePrivate(contextBinder, newNElement, newElement);
        }
    }

    private static createNElement(contextBinder: IContextBinder, nElementParent: INTreeElement | null, nativeElement: Element, 
                                  cloneOfNElement?: INElement, immediateParent?: INElement): INElement {
        return new NElement(contextBinder, nElementParent, nativeElement,
                            cloneOfNElement, immediateParent,
                            (nTreeElementParent, nElement) => this.cloneTree(contextBinder, nTreeElementParent, nElement),
                            (nTreeElementParent) => this.constructTreePrivate(contextBinder, nTreeElementParent, nativeElement));
    }

    private static createNTreeElement(nativeElement: Element): INTreeElement {
        return new NTreeElement(nativeElement);
    }
}