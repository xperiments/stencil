import type * as d from '../../declarations';
import { normalizeFsPath } from '@utils';
import type { Plugin } from 'rollup';
import ts from 'typescript';

export const serverPlugin = (config: d.Config, platform: string): Plugin => {
  const isHydrateBundle = platform === 'hydrate';
  const serverVarid = `@removed-server-code`;

  const externals = config.outputTargets.reduce((externals, o) => {
    if (o.type === 'dist-hydrate-script') {
      o.external.forEach(external => {
        if (!externals.includes(external)) {
          externals.push(external);
        }
      });
    }
    return externals;
  }, [] as string[]);

  return {
    name: 'serverPlugin',

    resolveId(id) {
      if (id === serverVarid) {
        return id;
      }
      if (isHydrateBundle && externals.includes(id)) {
        // don't attempt to bundle node builtins for the hydrate bundle
        return {
          id,
          external: true,
        };
      }
      return null;
    },

    load(id) {
      if (id === serverVarid) {
        // shared variable we'll use to represent code that was removed
        return `export const removedServerVar = {/* server-side only code removed from client build */};`;
      }
      return null;
    },

    transform(code, id) {
      if (/\0/.test(id)) {
        return null;
      }

      if (!isHydrateBundle) {
        id = normalizeFsPath(id);
        if (id.includes('.server/') || id.endsWith('.server')) {
          // any path that has .server in it shouldn't actually
          // be bundled in the web build, only the hydrate build
          return removeServerCode(id, code);
        }
      }
      return null;
    },
  };
};

const removeServerCode = (fileName: string, code: string) => {
  const output: string[] = [];

  // shared variable we'll use to represent code that was removed
  output.push(`import { removedServerVar } from '@removed-server-code';`);

  const tsSourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2018);

  tsSourceFile.statements.forEach(s => {
    if (ts.isExportDeclaration(s) && s.exportClause && ts.isNamedExports(s.exportClause) && s.exportClause.elements) {
      // export { dmc }
      s.exportClause.elements.forEach(element => {
        if (element.name && element.name.text) {
          output.push(`export const ${element.name.text} = removedServerVar;`);
        }
      });
    } else if (ts.isExportAssignment(s)) {
      // export default
      output.push(`export default removedServerVar;`);
    } else if (
      ts.isVariableStatement(s) &&
      s.modifiers &&
      s.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword) &&
      s.declarationList &&
      s.declarationList.declarations
    ) {
      // export const mph = 88;
      s.declarationList.declarations.forEach(declaration => {
        if (declaration.name && ts.isIdentifier(declaration.name)) {
          output.push(`export const ${declaration.name.text} = removedServerVar;`);
        }
      });
    } else if (
      (ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s)) &&
      s.modifiers &&
      s.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword) &&
      s.name &&
      ts.isIdentifier(s.name)
    ) {
      // export function doc() {}
      // export class Marty() {}
      output.push(`export const ${s.name.text} = removedServerVar;`);
    }
  });

  return output.join('\n');
};
