import type { FunctionalComponent } from '@stencil/core';

export type RouteParams = { [prop: string]: string };
export type PageState = { [prop: string]: any };

export type RoutePath = string | RegExp | ((path: string) => RouteParams | boolean | undefined | null);

export type RouterState = Readonly<InternalRouterState>;

export type OnChangeHandler<T extends keyof InternalRouterState> = (
  newValue: InternalRouterState[T],
  oldValue: InternalRouterState[T],
) => void;

export interface Router {
  readonly Switch: FunctionalComponent<{}>;
  readonly url: URL;
  readonly activePath: string;
  dispose(): void;
  onChange(key: 'url', cb: OnChangeHandler<'url'>): void;
  onChange(key: 'activePath', cb: OnChangeHandler<'activePath'>): void;
  push(href: string): void;
  preload(opts: { href: string; as: 'fetch' | 'module' }): void;
}

export interface RouterProps {
  router: Router;
}

export type RouteProps = RenderProps | RedirectProps;

export interface RenderProps {
  path: RoutePath;
  id?: string;
  mapParams?: (matchedRoute: MatchedRoute) => PageState;
  render?: (pageState: PageState | null, matchedRoute: MatchedRoute) => any;
}

export interface MatchedRoute {
  params: RouteParams;
  url: URL;
}

export type MapParamData = (matchedRoute: MatchedRoute) => PageState | Promise<PageState>;

export interface RedirectProps {
  path: RoutePath;
  to: string;
}

export interface RouteEntry {
  path: RoutePath;
  jsx?: any;
  mapParams?: (matchedRoute: MatchedRoute) => PageState;
  to?: string;
  id?: string;
}

export interface InternalRouterState {
  url: URL;
  activePath: string;
}

export interface RouterOptions {
  parseURL?: (url: URL) => string;
  serializeURL?: (path: string) => URL;
  beforePush?: (path: string) => void | Promise<void>;
}

export type StateHistory = Map<string, any>;
