import { PrerenderConfig } from '../../internal';

export const config: PrerenderConfig = {
  hydrateOptions() {
    return {
      runtimeLogging: true,
    };
  },
};
