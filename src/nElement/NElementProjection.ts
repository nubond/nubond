import { Constants } from '../Constants';

import { Helpers } from '../Helpers';
import { Console } from '../Console';

export class NElementProjection {
    private readonly DEFAULT_PREFIX_AND_SEPARATOR = Constants.DEFAULT_PREFIX + Constants.DEFAULT_SEPARATOR;
    
    private readonly PROJECTION_ATTRIBUTE_NAME = this.DEFAULT_PREFIX_AND_SEPARATOR + Constants.PROJECTION_ATTRIBUTE_PREFIX_NAME;
    private readonly PROJECTION_PARENT_ATTRIBUTE_NAME = this.DEFAULT_PREFIX_AND_SEPARATOR + Constants.PROJECTION_PARENT_SLOT_ATTRIBUTE_PREFIX_NAME;
    private readonly PROJECT_TO_ATTRIBUTE_NAME = this.DEFAULT_PREFIX_AND_SEPARATOR + Constants.PROJECTION_REPLACE_SLOT_ATTRIBUTE_PREFIX_NAME;

    private readonly _nativeElement: ParentNode;

    private readonly _fallbackProjection: HTMLTemplateElement | undefined;
    private readonly _projections: Map<string, Node> | undefined;

    constructor(sourceElement: ParentNode, targetElement?: ParentNode) {
        this._nativeElement = Helpers.isUndefined(targetElement) ? sourceElement : targetElement!;

        //handle projections
        let child = sourceElement.firstChild;
        if (child !== null) {
            let projections = new Map<string, Node>();
            let fallbackProjection = document.createElement('template');
            let hasDefaultProjection = false;
            let hasFallbackProjection = false;

            while (child !== null) {
                switch (child.nodeType) {
                    case Node.ELEMENT_NODE:
                        const projectToAttr = (<Element>child).attributes.getNamedItem(this.PROJECTION_ATTRIBUTE_NAME);
                        if (projectToAttr !== null) {
                            if ((projectToAttr.value === null) || (projectToAttr.value === '')) {
                                if (!hasDefaultProjection) {
                                    hasDefaultProjection = true;
                                    projections.set('', child.cloneNode(true));
                                } else {
                                    Console.error(sourceElement, `element projection data is corrupted. Projection without name can't be used when there are multiple projections.`);
                                }
                            } else {
                                projections.set(projectToAttr.value, child.cloneNode(true));
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

    public cleanUp(): void {
        if (Helpers.isUndefined(this._fallbackProjection)) {
            let child = this._nativeElement.firstChild;
            while (child !== null) {
                child.remove();
                child = this._nativeElement.firstChild;
            }
        } else {
            this._nativeElement.replaceChildren(this._fallbackProjection!.content.cloneNode(true));
        }
    }

    public process(): void {
        if (!Helpers.isUndefined(this._projections)) {
            const projectParents = this._nativeElement.querySelectorAll(`[${this.PROJECTION_PARENT_ATTRIBUTE_NAME}]`);
            if (projectParents.length > 0) {
                for (const el of Array.from(projectParents)) {
                    const projectToAttr = el.attributes.getNamedItem(this.PROJECTION_PARENT_ATTRIBUTE_NAME);
                    const projectToName = projectToAttr === null ? '' : projectToAttr.value;
                    if (this._projections!.has(projectToName)) {
                        el.replaceChildren(this._projections!.get(projectToName)!.cloneNode(true));
                    } /*else {
                        el.remove();
                    }*/
                }
            }

            const projectTos = this._nativeElement.querySelectorAll(`[${this.PROJECT_TO_ATTRIBUTE_NAME}]`);
            if (projectTos.length > 0) {
                for (const el of Array.from(projectTos)) {
                    const projectToAttr = el.attributes.getNamedItem(this.PROJECT_TO_ATTRIBUTE_NAME);
                    const projectToName = projectToAttr === null ? '' : projectToAttr.value;
                    if (this._projections!.has(projectToName)) {
                        el.replaceWith(this._projections!.get(projectToName)!.cloneNode(true));
                    } /* else {
                        el.remove();
                    }*/
                }
            }
        }
    }
}