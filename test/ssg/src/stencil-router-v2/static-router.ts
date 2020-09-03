import { Build } from '@stencil/core';
import { createRouter } from './router';
import { isPromise, normalizePathname, urlFromHref, devDebug } from './utils/helpers';
import type { MapParamData, PageState, RouterOptions, RouteParams, StateHistory } from './types';

const stateHistory: StateHistory = new Map();

const getStateCacheKey = (url: string | URL) => (typeof url === 'string' ? urlFromHref(url) : url).href;

const getStateCache = (url: string | URL) => stateHistory.get(getStateCacheKey(url));

const hasStateCache = (url: string | URL) => stateHistory.has(getStateCacheKey(url));

const setStateCache = (url: string | URL, stateData: any) => stateHistory.set(getStateCacheKey(url), stateData);

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

      if (staticElm) {
        staticState = JSON.parse(staticElm.textContent!);
        staticElm.remove();
        devDebug(`staticClientState: ${location.pathname} [parsed page.state]`);
      } else {
        devDebug(`staticClientState: ${location.pathname} [page.state not found]`);
        staticState = undefined;
      }
      setStateCache(location.href, staticState);
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

  const beforePush = async (pushToUrl: URL) => {
    try {
      if (hasStateCache(pushToUrl)) {
        // already have static state ready to go
        devDebug(`beforePush: ${pushToUrl.pathname} [cached state]`);
        return;
      }

      // try fetching for the static state
      const fetchUrl = getDataFetchPath(pushToUrl);
      const res = await fetch(fetchUrl, {
        cache: 'force-cache',
      });

      if (res.ok) {
        // awesome, we got a good response for page state data
        const staticData = await res.json();
        if (staticData.components) {
          // page state is all the known components already
          // let's preload them all before navigating
          // await preloadComponents({ tags: staticData.components });
        }
        // cache the page state, which could be undefined, but that's valuable too
        setStateCache(pushToUrl, staticData['page.state']);
        devDebug(`beforePush: ${pushToUrl.pathname} [fetched state]`);

        // stop so we don't trigger the location.href
        return;
      } else {
        devDebug(`beforePush: ${pushToUrl.pathname} [fetched failed ${res.status}]`);
      }
    } catch (e) {
      devDebug(`beforePush: ${pushToUrl.pathname}, ${e}`);
    }

    // something errored, fallback to a normal page navigation
    location.href = pushToUrl.pathname;
  };

  const onHrefRender = (navigatedToUrl, currentUrl) => {
    // let's add a <link rel="prefetch"> for links found on this page
    // if the page we're navigating to is different than the current page
    // and we haven't cached it already
    // and there isn't already a <link> in the document.head for this url
    if (
      normalizePathname(navigatedToUrl) !== normalizePathname(currentUrl) &&
      !getStateCache(navigatedToUrl) &&
      !doc.head.querySelector(`link[href="${getDataFetchPath(navigatedToUrl)}"]`)
    ) {
      const linkElm = doc.createElement('link');
      linkElm.setAttribute('rel', 'prefetch');
      linkElm.setAttribute('href', getDataFetchPath(navigatedToUrl));
      linkElm.setAttribute('as', 'fetch');
      doc.head.appendChild(linkElm);
    }
  };

  const reloadOnPopState = () => {
    const hasState = hasStateCache(location.href);
    devDebug(`reloadOnPopState: ${location.pathname} [hasStateCache: ${hasState}]`);
    return !hasState;
  };

  if (Build.isBrowser) {
    if (!buildId) {
      console.warn(`Stencil Router: html document has not been prerendered, falling back to non-static router`);
      return createRouter(opts);
    }
    staticClientState();
  }

  return createRouter({
    beforePush,
    onHrefRender,
    reloadOnPopState,
    ...opts,
  });
};
