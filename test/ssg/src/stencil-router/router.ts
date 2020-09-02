import { FunctionalComponent, Build } from '@stencil/core';
import { createStore } from '@stencil/store';
import type {
  Router,
  RouterOptions,
  InternalRouterState,
  RouteEntry,
  RouteProps,
  RoutePath,
  RouteParams,
  PageState,
} from './types';
import { getDataFetchPath, isPromise, staticClientState } from './static-state';
import { getStateCache } from './static-cache';

interface MatchResult {
  params: RouteParams;
  route: RouteEntry;
}
let defaultRouter: Router | undefined;

export const createRouter = (opts?: RouterOptions): Router => {
  const win = window;
  const url = new URL(win.location.href);
  const parseURL = opts?.parseURL ?? DEFAULT_PARSE_URL;
  const beforePush =
    opts?.beforePush ??
    (() => {
      return;
    });

  const { state, onChange, dispose } = createStore<InternalRouterState>(
    {
      url,
      activePath: parseURL(url),
    },
    (newV, oldV, prop) => {
      if (prop === 'url') {
        return newV.href !== oldV.href;
      }
      return newV !== oldV;
    },
  );

  const push = (href: string) => {
    history.pushState(null, null as any, href);
    const url = new URL(href, document.baseURI);
    state.url = url;
    state.activePath = parseURL(url);
  };

  const match = (routes: RouteEntry[]): MatchResult | undefined => {
    const { activePath } = state;
    for (const route of routes) {
      const params = matchPath(activePath, route.path);
      if (params) {
        if (route.to != null) {
          push(route.to);
          return match(routes);
        } else {
          return { params, route };
        }
      }
    }
    return undefined;
  };

  const navigationChanged = (ev?: PopStateEvent) => {
    if (ev && !staticClientState()) {
      // if there's an event then it's from 'popstate' event
      // and we didn't have cached state and didn't have
      // state in the <script> element, probably when full
      // reloading page 2, and hitting the back button to page 1 that
      // would be in the user's browserhistory, but nothing in-memory
      // in this window instance, so let's do a full page reload
      // cuz we don't have any data we can load synchronously
      location.reload();
    } else {
      // we ensured we have synchronous static state ready to go
      state.url = new URL(win.location.href);
      state.activePath = parseURL(state.url);
    }
  };

  const Switch: any = (_: any, childrenRoutes: RouteEntry[]) => {
    const result = match(childrenRoutes);
    const route = result?.route;
    if (result) {
      if (typeof route.jsx === 'function') {
        const pageState = route.mapParams
          ? route.mapParams({
              params: result.params,
              url: state.url,
            })
          : undefined;

        if (Build.isServer) {
          if (isPromise<PageState>(pageState)) {
            return pageState
              .then(pageState => {
                return route.jsx(pageState, result.params);
              })
              .catch(err => {
                console.error(err);
                return route.jsx({}, result.params);
              });
          }
        }

        return route.jsx(pageState, result.params);
      } else {
        return route.jsx;
      }
    }
  };

  const disposeRouter = () => {
    defaultRouter = null;
    win.removeEventListener('popstate', navigationChanged);
    dispose();
  };

  const router = (defaultRouter = {
    Switch,
    get url() {
      return state.url;
    },
    get activePath() {
      return state.activePath;
    },
    push: async href => {
      await beforePush(href);
      push(href);
    },
    preload: opts => {
      if (!document.head.querySelector(`link[href="${opts.href}"]`)) {
        const lnk = document.createElement('link');
        lnk.href = opts.href;
        if (opts.as === 'module') {
          lnk.rel = 'modulepreload';
        } else {
          lnk.rel = 'prefetch';
          lnk.as = opts.as;
        }
        document.head.appendChild(lnk);
      }
    },
    onChange: onChange as any,
    dispose: disposeRouter,
  });

  // Initial update
  navigationChanged();

  // Listen URL changes
  win.addEventListener('popstate', navigationChanged);

  return router;
};

export const Route: FunctionalComponent<RouteProps> = (props, children) => {
  if ('to' in props) {
    const entry: RouteEntry = {
      path: props.path,
      to: props.to,
    };
    return entry as any;
  }
  if (Build.isDev && props.render && children.length > 0) {
    console.warn('Route: if `render` is provided, the component should not have any children');
  }
  const entry: RouteEntry = {
    path: props.path,
    id: props.id,
    jsx: props.render ?? children,
    mapParams: props.mapParams,
  };
  return entry as any;
};

export const href = (href: string, router: Router | undefined = defaultRouter) => {
  const url = new URL(href, document.baseURI);
  const dataFetchUrl = getDataFetchPath(href);

  if (Build.isDev) {
    if (!router) {
      console.error('Router must be defined in href()', href);
      return {
        href,
      };
    }
    const urlParts = url.pathname.split('/');
    const baseName = urlParts[urlParts.length - 1];
    if (baseName.indexOf('.') > -1) {
      console.error(
        'Router href() should only be used for a page link, without an extension, and not for an asset',
        href,
      );
      return {
        href,
      };
    }
    if (url.host !== new URL(document.baseURI).host) {
      console.error('Router href() should not be used for external urls', href);
      return {
        href,
      };
    }
  }

  if (!getStateCache(url) && !document.head.querySelector(`link[href="${dataFetchUrl}"]`)) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'prefetch');
    link.setAttribute('href', dataFetchUrl);
    link.setAttribute('as', 'fetch');
    document.head.appendChild(link);
  }

  return {
    href,
    onClick: (ev: MouseEvent) => {
      if (!ev.metaKey && !ev.ctrlKey && ev.which != 2 && ev.button != 1) {
        ev.preventDefault();
        router.push(href);
      }
    },
  };
};

const matchPath = (pathname: string, path: RoutePath): RouteParams | undefined => {
  if (typeof path === 'string') {
    if (path === pathname) {
      return {};
    }
  } else if (typeof path === 'function') {
    const params = path(pathname);
    if (params) {
      return params === true ? {} : { ...params };
    }
  } else {
    const results = path.exec(pathname) as any;
    if (results) {
      path.lastIndex = 0;
      return { ...results };
    }
  }
  return undefined;
};

const DEFAULT_PARSE_URL = (url: URL) => url.pathname.toLowerCase();

export const NotFound = () => ({});
