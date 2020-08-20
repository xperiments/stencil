import { Config } from '../../internal';

export const config: Config = {
  namespace: 'SSG',
  outputTargets: [{ type: 'www', baseUrl: 'https://ssg.stenciljs.com/', serviceWorker: false }],
  maxConcurrentWorkers: 0,
  devServer: {
    logRequests: true,
    worker: false,
  },
  hashFileNames: false,
};
