import { createRouter } from './router';
import { Build } from '@stencil/core';
import { getStaticScript, setStaticScript, setStateCache, getStateCache } from './static-cache';
import type { MapParamData, MatchedRoute, PageState } from './types';

export const createStaticRouter = () =>
  createRouter({
    beforePush,
  });

export const staticState = (mapFn: MapParamData): ((matchedRoute: MatchedRoute) => PageState) => {
  if (Build.isServer) {
    // server side (async)
    return matchedRoute => staticServerState(matchedRoute, mapFn);
  } else {
    return () => staticClientState();
  }
};

export const staticClientState = () => {
  // client side (sync)
  try {
    let staticState = getStateCache(location.href);
    if (!staticState) {
      const staticElm = getStaticScript();
      if (Build.isDev && !staticElm) {
        console.error('SSR Dev server must be used during development');
        staticState = {};
      } else {
        staticState = JSON.parse(staticElm.textContent!);
        setStateCache(location.href, staticState);
        staticElm.remove();
      }
    }
    return staticState.state;
  } catch (e) {
    console.error(e);
  }
};

const staticServerState = (matchedRoute: MatchedRoute, mapFn: MapParamData): PageState => {
  const inputData = mapFn(matchedRoute);

  if (isPromise(inputData)) {
    return inputData.then(setServerStaticData).catch(err => {
      console.error(err);
      return setServerStaticData({});
    });
  }

  return setServerStaticData(inputData);
};

const setServerStaticData = (inputData: any) => {
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
    setStaticScript(JSON.stringify({ state: staticData.root }));
  });

  return proxiedData;
};

const beforePush = async (path: string) => {
  try {
    const pushToUrl = new URL(path, document.baseURI);
    if (!getStateCache(pushToUrl)) {
      const fetchUrl = getDataFetchPath(path);
      const res = await fetch(fetchUrl, {
        cache: 'force-cache',
      });
      if (res.ok) {
        const staticData = await res.json();
        if (staticData.components) {
          // await preloadComponents({ tags: staticData.components });
        }
        return setStateCache(pushToUrl, staticData);
      }
    }
    return;
  } catch (e) {}
  location.href = path;
};

export const getDataFetchPath = (path: string) =>
  `${path.endsWith('/') ? path : path + '/'}page.state.json?s=${document.documentElement.dataset.stencilBuild || ''}`;

export const isPromise = <T = any>(v: any): v is Promise<T> =>
  !!v && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';
