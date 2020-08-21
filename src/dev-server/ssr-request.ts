import type * as d from '../declarations';
import type { ServerResponse } from 'http';
import { responseHeaders } from './dev-server-utils';
import { appendDevServerClientScript } from './serve-file';
import { isString } from 'util';
import { catchError } from '@utils';

export async function ssrRequest(
  devServerConfig: d.DevServerConfig,
  serverCtx: d.DevServerContext,
  req: d.HttpRequest,
  res: ServerResponse,
) {
  const diagnostics: d.Diagnostic[] = [];
  try {
    let status = 500;
    let content = '';

    const buildResults = await serverCtx.getBuildResults();

    if (!isString(buildResults.hydrateAppFilePath)) {
      diagnostics.push({ messageText: `Missing hydrateAppFilePath`, level: `error`, type: `ssr` });
    } else if (!isString(devServerConfig.srcIndexHtml)) {
      diagnostics.push({ messageText: `Missing srcIndexHtml`, level: `error`, type: `ssr` });
    } else {
      try {
        const srcIndexHtml = await serverCtx.sys.readFile(devServerConfig.srcIndexHtml);
        if (!isString(srcIndexHtml)) {
          diagnostics.push({
            messageText: `Unable to load src index html: ${devServerConfig.srcIndexHtml}`,
            level: `error`,
            type: `ssr`,
          });
        } else {
          const hydrateApp: HydrateApp = require(buildResults.hydrateAppFilePath);

          const opts: d.SerializeDocumentOptions = {
            prettyHtml: true,
            url: req.url.href,
          };

          const ssrResults = await hydrateApp.renderToString(srcIndexHtml, opts);

          if (ssrResults.diagnostics.length > 0) {
            diagnostics.push(...ssrResults.diagnostics);
          } else {
            status = ssrResults.httpStatus;
            content = ssrResults.html;
          }
        }
      } catch (e) {
        catchError(diagnostics, e);
      }
    }

    if (diagnostics.length > 0) {
      content = getSsrErrorContent(diagnostics);
    }

    if (devServerConfig.websocket) {
      content = appendDevServerClientScript(devServerConfig, req, content);
    }

    serverCtx.logRequest(req, status);

    res.writeHead(
      status,
      responseHeaders({
        'content-type': 'text/html; charset=utf-8',
        'content-length': Buffer.byteLength(content, 'utf8'),
      }),
    );
    res.write(content);
    res.end();
  } catch (e) {
    serverCtx.serve500(req, res, e, `ssrRequest`);
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
    <h1>SSR Dev Error</h1>
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

type HydrateApp = {
  renderToString: (html: string, options: d.SerializeDocumentOptions) => Promise<d.HydrateResults>;
};
