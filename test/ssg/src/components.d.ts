/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
export namespace Components {
    interface AppRoot {
    }
    interface BlogPost {
        "data": any;
    }
}
declare global {
    interface HTMLAppRootElement extends Components.AppRoot, HTMLStencilElement {
    }
    var HTMLAppRootElement: {
        prototype: HTMLAppRootElement;
        new (): HTMLAppRootElement;
    };
    interface HTMLBlogPostElement extends Components.BlogPost, HTMLStencilElement {
    }
    var HTMLBlogPostElement: {
        prototype: HTMLBlogPostElement;
        new (): HTMLBlogPostElement;
    };
    interface HTMLElementTagNameMap {
        "app-root": HTMLAppRootElement;
        "blog-post": HTMLBlogPostElement;
    }
}
declare namespace LocalJSX {
    interface AppRoot {
    }
    interface BlogPost {
        "data"?: any;
    }
    interface IntrinsicElements {
        "app-root": AppRoot;
        "blog-post": BlogPost;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "app-root": LocalJSX.AppRoot & JSXBase.HTMLAttributes<HTMLAppRootElement>;
            "blog-post": LocalJSX.BlogPost & JSXBase.HTMLAttributes<HTMLBlogPostElement>;
        }
    }
}