import type { FunctionalComponent } from '@stencil/core';

export type RouteParams = { [prop: string]: string };
export type PageState = { [prop: string]: any };

export type RoutePath = string | RegExp | ((path: string) => RouteParams | boolean | undefined | null);

export type OnChangeHandler = (newUrl: URL, oldURL: URL) => void;

export interface Router {
  readonly Switch: FunctionalComponent<{}>;
  readonly url: URL;
  readonly activePath: string;
  dispose(): void;
  onChange(cb: OnChangeHandler): void;
  onHrefRender(url: URL): void;
  push(href: string): Promise<void>;
  preload(opts: { href: string; as: 'fetch' | 'module' }): void;
  serializeURL(url: URL): string;
}

export interface RouterProps {
  router: Router;
}

export type RouteProps = RenderProps | RedirectProps;

export interface RenderProps {
  path: RoutePath;
  id?: string;
  mapParams?: (params: RouteParams, url: URL) => PageState;
  render?: (params: RouteParams, mappedState: any | null) => any;
}

export type MapParamData = (params: RouteParams, url: URL) => PageState | Promise<PageState>;

export interface RedirectProps {
  path: RoutePath;
  to: string;
}

export interface RouteEntry {
  path: RoutePath;
  jsx?: any;
  mapParams?: (params: RouteParams, url: URL) => PageState;
  to?: string;
  id?: string;
}

export interface InternalRouterState {
  url: URL;
  views: SwitchView[];
}

export interface RouterOptions {
  beforePush?: (url: URL) => void | Promise<void>;
  onHrefRender?: (navigateToUrl: URL, currentUrl: URL) => void;
  reloadOnPopState?: (ev: PopStateEvent) => boolean;
  serializeURL?: (url: URL) => string;
}

export type StateHistory = Map<string, any>;

export interface SwitchView {
  /**
   * state
   */
  s: number;
  /**
   * children
   */
  c: any;
  /**
   * href
   */
  h: string;
  /**
   * promises
   */
  p: Promise<any>[];
}
