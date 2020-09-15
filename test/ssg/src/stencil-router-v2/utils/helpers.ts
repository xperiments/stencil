import { Build } from '@stencil/core';

export const isFunction = (v: any): v is Function => typeof v === 'function';

export const isPromise = <T = any>(v: any): v is Promise<T> =>
  !!v && (typeof v === 'object' || isFunction(v)) && isFunction(v.then);

export const isString = (v: any): v is string => typeof v === 'string';

export const normalizePathname = (url: URL | Location) => url.pathname.toLowerCase();

export const urlFromHref = (href: string) => new URL(href.split('#')[0], document.baseURI);

export const serializeURL = (url: URL) => url.pathname + url.search + url.hash;

export const devDebug = (msg: string) => {
  if (Build.isDev) {
    console.debug.apply(console, [
      '%crouter',
      `background: #717171; color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;`,
      msg,
    ]);
  }
};
