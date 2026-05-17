import { IContextConfig } from './IContextConfig';
import { IShadowRootConfig } from '../../IShadowRootConfig';

/**
* Component context config.
*/
export interface IComponentContextConfig extends IContextConfig {
    /**
    * Context ShadowRoot config.
    */
    shadowRootConfig?: IShadowRootConfig;
    /**
    * Context style sanitizer.
    *
    * @param style raw style
    * @returns sanitized style
    */
    styleSanitizer?: (style: string) => string;
}