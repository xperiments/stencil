import type { StateHistory } from './types';

export const setStaticData = (dataStr: string) => (getStaticElement().textContent = dataStr);

export const getStaticElement = () => {
  let staticDataElm = document.querySelector('[data-stencil-static]') as HTMLScriptElement | null;
  if (!staticDataElm) {
    staticDataElm = document.createElement('script');
    staticDataElm.type = 'application/json';
    staticDataElm.setAttribute('data-stencil-static', 'page.state');
    document.body.appendChild(staticDataElm);
  }
  return staticDataElm;
};

export const stateHistory: StateHistory = new Map();
