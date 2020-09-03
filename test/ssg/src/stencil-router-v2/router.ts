import { Build, FunctionalComponent } from '@stencil/core';
import { createStore } from '@stencil/store';
import { isPromise, normalizePathname, serializeURL as defaultSerializeUrl, urlFromHref } from './utils/helpers';
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

interface MatchResult {
  params: RouteParams;
  route: RouteEntry;
}
let defaultRouter: Router | undefined;

export const createRouter = (opts?: RouterOptions) => {
  const url = new URL(location.href);
  const serializeURL = opts?.serializeURL ?? defaultSerializeUrl;

  const { state, onChange, dispose } = createStore<InternalRouterState>(
    {
      url,
      activePath: normalizePathname(url),
    },
    (newV, oldV, prop) => {
      if (prop === 'url') {
        return (newV as URL).href !== (oldV as URL).href;
      }
      return newV !== oldV;
    },
  );

  const pushState = (updateUrl: URL) => {
    try {
      const href = serializeURL(updateUrl);
      if (href != null) {
        history.pushState(null, null as any, href);
        state.url = updateUrl;
        state.activePath = normalizePathname(updateUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const match = (routes: RouteEntry[]): MatchResult | undefined => {
    const { activePath } = state;
    for (const route of routes) {
      const params = matchPath(activePath, route.path);
      if (params) {
        if (route.to != null) {
          pushState(urlFromHref(route.to));
          return match(routes);
        } else {
          return { params, route };
        }
      }
    }
    return undefined;
  };

  const navigationChanged = (ev?: PopStateEvent) => {
    if (ev && opts?.reloadOnPopState(ev)) {
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
      state.url = new URL(location.href);
      state.activePath = normalizePathname(state.url);
    }
  };

  const Switch: any = (_: any, childrenRoutes: RouteEntry[]) => {
    const result = match(childrenRoutes);
    const route = result?.route;
    if (result) {
      if (typeof route.jsx === 'function') {
        const pageState = route.mapParams ? route.mapParams(result.params) : undefined;

        if (Build.isServer) {
          if (isPromise<PageState>(pageState)) {
            return pageState
              .then(resolvedPagedState => {
                return route.jsx(result.params, resolvedPagedState);
              })
              .catch(err => {
                console.error(err);
                return route.jsx(result.params);
              });
          }
        }

        return route.jsx(result.params, pageState);
      } else {
        return route.jsx;
      }
    }
  };

  const router: Router = (defaultRouter = {
    Switch,
    get url() {
      return urlFromHref(state.url.href);
    },
    get activePath() {
      return state.activePath;
    },
    push: async (href: string) => {
      const pushToUrl = urlFromHref(href);
      try {
        if (opts?.beforePush) {
          await opts.beforePush(pushToUrl);
        }
      } catch (e) {
        console.error(e);
      }
      pushState(pushToUrl);
    },
    onChange: onChange as any,
    onHrefRender: navigateToUrl => {
      if (opts?.onHrefRender) {
        opts.onHrefRender(navigateToUrl, state.url);
      }
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
    dispose: () => {
      defaultRouter = null;
      window.removeEventListener('popstate', navigationChanged);
      dispose();
    },
    serializeURL,
  });

  // initial update
  navigationChanged();

  // listen URL changes
  window.addEventListener('popstate', navigationChanged);

  return router;
};

export const href = (href: string, router: Router | undefined = defaultRouter) => {
  const goToUrl = urlFromHref(href);

  if (Build.isDev) {
    if (!router || typeof router.push !== 'function') {
      console.error('Router must be defined in href()', href);
      return {
        href,
      };
    }

    const baseName = goToUrl.pathname.split('/').pop();
    if (baseName.indexOf('.') > -1) {
      console.error(
        'Router href() should only be used for a page link, without an extension, and not for an asset',
        href,
      );
      return {
        href,
      };
    }
    if (goToUrl.host !== new URL(document.baseURI).host) {
      console.error('Router href() should not be used for external urls', href);
      return {
        href,
      };
    }
  }

  router.onHrefRender(goToUrl);

  return {
    href: router.serializeURL(goToUrl),
    onClick: (ev: MouseEvent) => {
      if (!ev.metaKey && !ev.ctrlKey && ev.which != 2 && ev.button != 1) {
        ev.preventDefault();
        router.push(href);
      }
    },
  };
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

export const NotFound = () => {};
