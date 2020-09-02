import type { StateHistory } from './types';

export const setStaticScript = (dataStr: string) => (getStaticScript().textContent = dataStr);

export const getStaticScript = () => {
  let staticDataElm = document.querySelector('[data-stencil-static]') as HTMLScriptElement | null;
  if (!staticDataElm) {
    staticDataElm = document.createElement('script');
    staticDataElm.type = 'application/json';
    staticDataElm.setAttribute('data-stencil-static', 'page.state');
    document.body.appendChild(staticDataElm);
  }
  return staticDataElm;
};

const stateHistory: StateHistory = new Map();

const getCacheKey = (url: string | URL) => ((typeof url === 'string' ? new URL(url) : url) as URL).href;

export const getStateCache = (url: string | URL) => stateHistory.get(getCacheKey(url));

export const setStateCache = (url: string | URL, stateData: any): void =>
  stateHistory.set(getCacheKey(url), stateData) as any;
