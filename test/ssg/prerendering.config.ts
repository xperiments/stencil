import { PrerenderConfig } from '../../internal';
import { afterHydrate } from './src/stencil-router/after-hydrate';

export const config: PrerenderConfig = {
  hydrateOptions() {
    return {
      runtimeLogging: true,
    };
  },
  async afterHydrate(doc, url, results) {
    await afterHydrate(doc, url, results);
  },
};
