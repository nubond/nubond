import { Constants } from '../Constants';

import { Helpers } from '../Helpers';
import { Console } from '../Console';

export class NElementProjection {
    private readonly _nativeElement: ParentNode;

    private readonly _fallbackProjection: HTMLTemplateElement | undefined;
    private readonly _projections: Map<string, Element> | undefined;

    constructor(sourceElement: ParentNode, targetElement?: ParentNode, encapsulated: boolean = true) {
        this._nativeElement = Helpers.isUndefined(targetElement) ? sourceElement : targetElement!;

        //handle projections
        let child = sourceElement.firstChild;
        if (child !== null) {
            let projections = new Map<string, Element>();
            let fallbackProjection = document.createElement('template');
            let hasDefaultProjection = false;
            let hasFallbackProjection = false;

            while (child !== null) {
                switch (child.nodeType) {
                    case Node.ELEMENT_NODE:
                        const projection = (<Element>child).attributes.getNamedItem(Constants.FULL_PROJECTION_ATTRIBUTE_NAME);
                        if (projection !== null) {
                            if ((projection.value === null) || (projection.value === '')) {
                                if (!hasDefaultProjection) {
                                    hasDefaultProjection = true;
                                    const clone = <Element>child.cloneNode(true);

                                    if (encapsulated) {
                                        clone.setAttribute(Constants.FULL_ENCAPSULATED_ATTRIBUTE_NAME, '');
                                    }

                                    projections.set('', clone);
                                } else {
                                    Console.error(sourceElement, `element projection data is corrupted. Projection without name can't be used when there are multiple projections.`);
                                }
                            } else {
                                if (!projections.has(projection.value)) {
                                    const clone = <Element>child.cloneNode(true);

                                    if (encapsulated) {
                                        clone.setAttribute(Constants.FULL_ENCAPSULATED_ATTRIBUTE_NAME, '');
                                    }

                                    projections.set(projection.value, clone);
                                } else {
                                    Console.error(sourceElement, `element projection data is corrupted. Projection with duplicated name found: ${projection.value}.`);
                                }
                            }

                            const nextChild: ChildNode | null = child.nextSibling;

                            child.remove();
                            child = nextChild;
                        } else {
                            hasFallbackProjection = true;
                            fallbackProjection.content.appendChild(child.cloneNode(true));
                            child = child.nextSibling;
                        }
                        break;
                    case Node.TEXT_NODE:
                        hasFallbackProjection = true;
                        fallbackProjection.content.appendChild(child.cloneNode(true));
                        child = child.nextSibling;
                        break;
                    default:
                        child = child.nextSibling;
                        break;
                }
            }

            if (hasFallbackProjection) {
                this._fallbackProjection = fallbackProjection;
            }

            if (projections.size > 0) {
                this._projections = projections;
            }
        }
    }

    public fallback(): boolean {
        let result = false;

        if (!Helpers.isUndefined(this._fallbackProjection)) {
            this._nativeElement.replaceChildren(this._fallbackProjection!.content.cloneNode(true));
            result = true;
        }

        return result;
    }

    public project(): ReadonlyArray<Element> {
        const projectedElements: Array<Element>  = [];

        if (!Helpers.isUndefined(this._projections)) {
            const projectTos = this._nativeElement.querySelectorAll(`[${Constants.FULL_PROJECT_TO_ATTRIBUTE_NAME}]`);
            if (projectTos.length > 0) {
                for (const el of Array.from(projectTos)) {
                    const projectToAttr = el.attributes.getNamedItem(Constants.FULL_PROJECT_TO_ATTRIBUTE_NAME);
                    const slotName = projectToAttr === null ? '' : projectToAttr.value;
                    const projection = this._projections!.get(slotName);
                    if (!Helpers.isUndefined(projection)) {
                        const projectionClone = <Element>projection!.cloneNode(true);

                        el.replaceChildren(projectionClone);
                        projectedElements.push(projectionClone);
                    }
                }
            }

            const projectInsteads = this._nativeElement.querySelectorAll(`[${Constants.FULL_PROJECT_INSTEAD_ATTRIBUTE_NAME}]`);
            if (projectInsteads.length > 0) {
                for (const el of Array.from(projectInsteads)) {
                    const projectToAttr = el.attributes.getNamedItem(Constants.FULL_PROJECT_INSTEAD_ATTRIBUTE_NAME);
                    const slotName = projectToAttr === null ? '' : projectToAttr.value;
                    const projection = this._projections!.get(slotName);
                    if (!Helpers.isUndefined(projection)) {
                        const projectionClone = <Element>projection!.cloneNode(true);

                        el.replaceWith(projectionClone);
                        projectedElements.push(projectionClone);
                    }
                }
            }
        }

        return projectedElements;
    }

    public static isProjection(nativeElement: Element): boolean {
        return nativeElement.hasAttribute(Constants.FULL_PROJECTION_ATTRIBUTE_NAME);
    }

    public static isEncapsulatedProjection(nativeElement: Element): boolean {
        return nativeElement.hasAttribute(Constants.FULL_ENCAPSULATED_ATTRIBUTE_NAME);
    }
}