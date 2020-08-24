import { PrerenderUrlResults } from '../../../../internal';

export const afterHydrate = async (doc: Document, _url: URL, _opts: PrerenderUrlResults) => {
  let data = doc.getElementById(`stencil-static-data`) as HTMLScriptElement;
  if (!data) {
    data = doc.createElement('script');
    data.type = 'application/json';
    data.id = 'stencil-static-data';
    doc.body.appendChild(data);
  } else {
    // const content = data.textContent;
    // const jsonPath = path.resolve(opts.filePath, '../data.json');
    // setTimeout(() => {
    //   fs.writeFileSync(jsonPath, content, {
    //     encoding: 'utf-8',
    //   });
    // });
  }
};
