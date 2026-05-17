import { INElement, INTreeElement } from './interfaces/nElement/INElement';

import { NElement, NTreeElement } from './nElement/NElement';

import { ContextBinder } from './ContextBinder';

export class TreeBuilder {
    private constructor() {}

    public static constructTree(contextBinder: ContextBinder, nativeElement: Element | ShadowRoot, bindNativeElement: boolean): INTreeElement {
        const newNElement = bindNativeElement
                                ? (nativeElement instanceof ShadowRoot 
                                            ? this.createNElement(contextBinder, null, (<ShadowRoot>nativeElement).host)
                                            : this.createNElement(contextBinder, null, nativeElement))
                                : (nativeElement instanceof ShadowRoot 
                                            ? this.createNTreeElement((<ShadowRoot>nativeElement).host)
                                            : this.createNTreeElement(nativeElement));

        this.constructTreePrivate(contextBinder, newNElement, nativeElement);

        return newNElement;
    }

    private static constructTreePrivate(contextBinder: ContextBinder, nTreeElementParent: INTreeElement, nativeElement: ParentNode): void {
        let child = nativeElement.firstElementChild;

        while(child !== null) {
            if (NElement.isNApplicable(child)) {
                const newNElement = this.createNElement(contextBinder, nTreeElementParent, child);

                nTreeElementParent.addChild(newNElement);

                if (!newNElement.isSubTreeHandled) {
                    this.constructTreePrivate(contextBinder, newNElement, child);
                }
            } else {
                this.constructTreePrivate(contextBinder, nTreeElementParent, child);
            }

            child = child.nextElementSibling;
        }
    }

    private static cloneTree(contextBinder: ContextBinder, nElementParent: INElement | INTreeElement, nElement: INElement): void {
        const newElement = <Element>nElement.nativeElementForClone!.cloneNode(true);
        nElement.nativeElement.insertAdjacentElement('afterend', newElement);
        
        const newNElement = this.createNElement(contextBinder, nElementParent, newElement, nElement);

        nElementParent.addChild(newNElement);

        this.constructTreePrivate(contextBinder, newNElement, newElement);
    }

    private static createNElement(contextBinder: ContextBinder, nElementParent: INTreeElement | null, nativeElement: Element, 
                                  cloneOfNElement?: INElement): INTreeElement {
        return new NElement(contextBinder, nElementParent, nativeElement, cloneOfNElement,
                            (nElementsParent, nElement) => this.cloneTree(contextBinder, nElementsParent, nElement),
                            nElementsParent => this.constructTreePrivate(contextBinder, nElementsParent, nativeElement));
    }

    private static createNTreeElement(nativeElement: Element): INTreeElement {
        return new NTreeElement(nativeElement);
    }
}