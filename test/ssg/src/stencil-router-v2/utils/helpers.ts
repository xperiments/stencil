import { Build } from '@stencil/core';

export const isPromise = <T = any>(v: any): v is Promise<T> =>
  !!v && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';

export const normalizePathname = (url: URL) => url.pathname.toLowerCase();

export const urlFromHref = (href: string) => new URL(href, document.baseURI);

export const serializeURL = (url: URL) => url.pathname;

export const devDebug = (msg: string) => {
  if (Build.isDev) {
    console.debug(msg);
  }
};
