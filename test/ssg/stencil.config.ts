import { Config } from '../../internal';

export const config: Config = {
  namespace: 'SSG',
  outputTargets: [
    {
      type: 'www',
      prerenderConfig: './prerendering.config.ts',
      baseUrl: 'https://ssg.stenciljs.com/',
      serviceWorker: false,
    },
  ],
  devServer: {
    logRequests: true,
  },
  hashFileNames: false,
};
