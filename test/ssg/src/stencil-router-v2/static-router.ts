import { Build } from '@stencil/core';
import { createRouter } from './router';
import { isPromise, normalizePathname, urlFromHref } from './utils/helpers';
import type { MapParamData, PageState, RouterOptions, RouteParams, StateHistory } from './types';

const stateHistory: StateHistory = new Map();

const getStateCacheKey = (url: string | URL) => (typeof url === 'string' ? urlFromHref(url) : url).href;

const getStateCache = (url: string | URL) => stateHistory.get(getStateCacheKey(url));

const setStateCache = (url: string | URL, stateData: any): void =>
  stateHistory.set(getStateCacheKey(url), stateData) as any;

export const staticState = (mapFn: MapParamData): ((params: RouteParams) => PageState) => {
  if (Build.isServer) {
    // server side (async)
    return params => staticServerState(params, mapFn);
  } else {
    // client side (sync)
    return () => staticClientState();
  }
};

export const staticClientState = () => {
  // client side (sync)
  try {
    let staticState = getStateCache(location.href);
    if (!staticState) {
      const staticElm = document.querySelector('[data-stencil-static="page.state"]') as HTMLScriptElement | null;

      if (Build.isDev) {
        if (!staticElm) {
          console.error('SSR Dev server must be used during development');
          return false;
        }
      }

      if (staticElm) {
        staticState = JSON.parse(staticElm.textContent!);
        setStateCache(location.href, staticState);
        staticElm.remove();
      }
    }
    return staticState;
  } catch (e) {
    console.error(e);
  }
};

const staticServerState = (params: RouteParams, mapFn: MapParamData): PageState => {
  // server-side only
  const inputData = mapFn(params);

  if (isPromise(inputData)) {
    return inputData.then(setServerStaticData).catch(err => {
      console.error(err);
      return setServerStaticData({});
    });
  }

  return setServerStaticData(inputData);
};

const setServerStaticData = (inputData: any) => {
  // server-side only
  const staticData = { root: null as any };

  const getterProxy = (parentData: any, proxyKey: any, value: any): any => {
    const valueType = typeof value;

    if (value == null || valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      return (parentData[proxyKey] = value);
    }

    if (valueType === 'function') {
      return (parentData[proxyKey] = {});
    }

    if (Array.isArray(value)) {
      const arr: any[] = [];
      parentData[proxyKey] = arr;

      return value.map((arrValue, arrIndex) => {
        return getterProxy(arr, arrIndex, arrValue);
      });
    }

    if (valueType === 'object') {
      const obj: any = {};
      parentData[proxyKey] = obj;

      return new Proxy(value, {
        get(target, key, receiver) {
          const objValue = Reflect.get(target, key, receiver);
          return getterProxy(obj, key, objValue);
        },
      });
    }

    return value;
  };

  const proxiedData = getterProxy(staticData, 'root', inputData);

  window.addEventListener('DOMContentLoaded', () => {
    let staticDataElm = document.querySelector('[data-stencil-static="page.state"]') as HTMLScriptElement | null;
    if (!staticDataElm) {
      staticDataElm = document.createElement('script');
      staticDataElm.setAttribute('data-stencil-static', 'page.state');
      staticDataElm.setAttribute('type', 'application/json');
      document.body.appendChild(staticDataElm);
    }
    staticDataElm.textContent = JSON.stringify(staticData.root);
  });

  return proxiedData;
};

export const createStaticRouter = (opts?: RouterOptions) => {
  const doc = document;
  const buildId = doc.documentElement.dataset.stencilBuild;
  const getDataFetchPath = (url: URL) =>
    `${url.pathname.endsWith('/') ? url.pathname : url.pathname + '/'}page.state.json?s=${buildId}`;

  if (!buildId) {
    console.warn(`Stencil Router: html document has not been prerendered, falling back to non-static router`);
    return createRouter(opts);
  }

  return createRouter({
    beforePush: async (pushToUrl: URL) => {
      try {
        if (!getStateCache(pushToUrl)) {
          const fetchUrl = getDataFetchPath(pushToUrl);
          const res = await fetch(fetchUrl, {
            cache: 'force-cache',
          });
          if (res.ok) {
            const staticData = await res.json();
            if (staticData.components) {
              // await preloadComponents({ tags: staticData.components });
            }
            return setStateCache(pushToUrl, staticData['page.state']);
          }
        }
        return;
      } catch (e) {}

      // something errored, fallback to a normal page navigation
      location.href = pushToUrl.pathname;
    },
    onHrefRender: (navigatedToUrl, currentUrl) => {
      const dataFetchUrl = getDataFetchPath(navigatedToUrl);
      if (
        normalizePathname(navigatedToUrl) !== normalizePathname(currentUrl) &&
        !getStateCache(navigatedToUrl) &&
        !doc.head.querySelector(`link[href="${dataFetchUrl}"]`)
      ) {
        const link = doc.createElement('link');
        link.setAttribute('rel', 'prefetch');
        link.setAttribute('href', dataFetchUrl);
        link.setAttribute('as', 'fetch');
        doc.head.appendChild(link);
      }
    },
    reloadOnPopState: () => !staticClientState(),
    ...opts,
  });
};
