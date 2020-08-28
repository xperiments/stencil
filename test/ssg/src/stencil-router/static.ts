import { createRouter } from './router';
import { Build } from '@stencil/core';
import type { MapParamData, MatchedRoute, PageState } from './types';

export const createStaticRouter = () =>
  createRouter({
    beforePush,
  });

const setStaticData = (data: any) => {
  const script = getStatic();
  script.textContent = JSON.stringify({ data });
  return data;
};

export const staticState = (mapFn: MapParamData): ((matchedRoute: MatchedRoute) => PageState) => {
  if (Build.isServer) {
    return matchedRoute => {
      const data = mapFn(matchedRoute);
      if (isPromise(data)) {
        return data.then(setStaticData).catch(err => {
          console.error(err);
          return setStaticData({});
        });
      }
      return setStaticData(data);
    };
  } else {
    return () => {
      const dataScript = getStatic();
      if (Build.isDev && !dataScript) {
        console.error('SSR Dev server must be used during development');
        return {};
      }
      return (JSON.parse(dataScript.textContent!) || {}).data;
    };
  }
};

const beforePush = async (path: string) => {
  const url = getDataFetchPath(path);
  const script = getStatic();
  try {
    const res = await fetch(url, {
      cache: 'force-cache',
    });
    if (res.ok) {
      script.textContent = await res.text();
      return;
    }
  } catch (e) {}
  script.textContent = '';
  location.href = path;
};

export const getDataFetchPath = (path: string) =>
  `${path.endsWith('/') ? path : path + '/'}page.state.json?s=${document.documentElement.dataset.stencilBuild || ''}`;

const getStatic = () => {
  let staticDataElm = document.querySelector('[data-stencil-static]') as HTMLScriptElement | null;
  if (!staticDataElm) {
    staticDataElm = document.createElement('script');
    staticDataElm.type = 'application/json';
    staticDataElm.setAttribute('data-stencil-static', 'page.state');
    document.body.appendChild(staticDataElm);
  }
  return staticDataElm;
};

export const isPromise = <T = any>(v: any): v is Promise<T> =>
  !!v && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';
