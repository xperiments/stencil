import type * as d from '../declarations';
import type { ServerResponse } from 'http';
import { responseHeaders, sendLogRequest } from './dev-server-utils';
import { serve500 } from './serve-500';
import { appendDevServerClientScript } from './serve-file';

export async function ssrRequest(
  devServerConfig: d.DevServerConfig,
  sys: d.CompilerSystem,
  req: d.HttpRequest,
  res: ServerResponse,
  sendMsg: d.DevServerSendMessage,
) {
  try {
    let content = '';

    const coreCompiler = await import('@stencil/core/compiler');

    const config: d.Config = {};

    const prerenderer = await coreCompiler.createPrerenderer(config);

    const results = await prerenderer.start({
      hydrateAppFilePath,
      componentGraph,
      srcIndexHtmlPath,
    });

    if (results.diagnostics.length > 0) {
      content = getSsrErrorContent(results.diagnostics);
    } else {
    }

    if (devServerConfig.websocket) {
      content = appendDevServerClientScript(devServerConfig, req, content);
    }

    res.writeHead(
      200,
      responseHeaders({
        'content-type': 'text/html; charset=utf-8',
        'content-length': Buffer.byteLength(content, 'utf8'),
      }),
    );
    res.write(content);
    res.end();
  } catch (e) {
    serve500(devServerConfig, req, res, e, 'ssrRequest', sendMsg);
  }
}

function getSsrErrorContent(diagnostics: d.Diagnostic[]) {
  return `<!doctype html>
<html>
  <head>
    <title>SSR Error</title>
    <style>
      body {
        font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace !important;
      }
    </style>
  </head>
  <body>
      <h1>SSR Error</h1>
    ${diagnostics.map(
      diagnostic =>
        `
      <p>
        ${diagnostic.messageText}
      </p>
      `,
    )}
  </body>
</html>
`;
}
