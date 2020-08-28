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
  MatchedRoute,
} from './types';
import { getDataFetchPath, isPromise } from './static';

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

  const navigationChanged = () => {
    state.url = new URL(win.location.href);
    state.activePath = parseURL(state.url);
  };

  const Switch: any = (_: any, childrenRoutes: RouteEntry[]) => {
    const result = match(childrenRoutes);
    if (result) {
      if (typeof result.route.jsx === 'function') {
        let params = result.params;
        if (result.route.mapParams) {
          const matchedRoute: MatchedRoute = {
            params,
            url: state.url,
          };
          params = result.route.mapParams(matchedRoute);
        }
        if (Build.isServer) {
          if (isPromise<RouteParams>(params)) {
            return params.then(result.route.jsx).catch(err => {
              console.error(err);
              return result.route.jsx({});
            });
          }
        }
        return result.route.jsx(params);
      } else {
        return result.route.jsx;
      }
    }
  };

  const disposeRouter = () => {
    defaultRouter = undefined;
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
  if (Build.isDev) {
    if (!router) {
      console.error('Router must be defined in href()', href);
      return {
        href,
      };
    }
    const url = new URL(href, document.baseURI);
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

  if (Build.isServer) {
    const dataFetchUrl = getDataFetchPath(href);
    if (!document.head.querySelector(`link[href="${dataFetchUrl}"]`)) {
      const link = document.createElement('link');
      link.setAttribute('rel', 'prefetch');
      link.setAttribute('as', 'fetch');
      link.setAttribute('href', dataFetchUrl);
      document.head.appendChild(link);
    }
    return {
      href,
    };
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
