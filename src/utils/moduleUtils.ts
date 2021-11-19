import { log, fileProvider } from '../io';
import { PathLike, ProcessorContext } from '../models';
import { isPromise } from './promiseUtils';
import { toMultiLineArray } from './stringUtils';
import Module from 'module';
import { EOL } from 'os';
import path from 'path';
import vm from 'vm';

export function resolveModule(request: string, context: string): string | undefined {
  let resolvedPath: string | undefined;
  try {
    try {
      resolvedPath = Module.createRequire(path.resolve(context, 'package.json')).resolve(request);
    } catch (e) {
      resolvedPath = require.resolve(request, { paths: [context] });
    }
  } catch (e) {
    log.debug(e);
  }
  return resolvedPath;
}

export function loadModule<T>(request: string, context: string, force = false): T | undefined {
  try {
    if (force) {
      clearModule(request, context);
    }
    return Module.createRequire(path.resolve(context, 'package.json'))(request);
  } catch (e) {
    const resolvedPath = resolveModule(request, context);
    if (resolvedPath) {
      if (force) {
        clearRequireCache(resolvedPath);
      }
      return require(resolvedPath);
    }
  }
  return undefined;
}

function createModule(filename: string, source?: string | undefined): Module {
  const mod = new Module(filename, require.main);
  mod.filename = filename;
  // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L565-L640
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
  mod.paths = (Module as any)._nodeModulePaths(path.dirname(filename));
  if (source) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
    (mod as any)._compile(source, filename);
  }
  return mod;
}

export function clearModule(request: string, context: string): void {
  const resolvedPath = resolveModule(request, context);
  if (resolvedPath) {
    clearRequireCache(resolvedPath);
  }
}

function clearRequireCache(id: string, map = new Map()) {
  const module = require.cache[id];
  if (module) {
    map.set(id, true);
    // Clear children modules
    module.children.forEach(child => {
      if (!map.get(child.id)) {
        clearRequireCache(child.id, map);
      }
    });
    delete require.cache[id];
  }
}

export async function runScript(
  source: string,
  options: {
    fileName: PathLike;
    lineOffset: number;
    context: Record<string, unknown>;
    require?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const filename = fileProvider.fsPath(options.fileName);

  const mod = createModule(filename);

  function extendedRequire(id: string) {
    if (options.require && options.require[id]) {
      return options.require[id];
    }
    return mod.require(id);
  }

  const context = vm.createContext({
    ...global,
    Buffer,
    process,
    requireUncached: (id: string) => {
      const dirName = fileProvider.dirname(filename);
      if (dirName) {
        clearModule(id, fileProvider.fsPath(dirName));
      }
      return mod.require(id);
    },
    ...options.context,
  });

  const compiledWrapper = vm.runInContext(Module.wrap(`${EOL}${source}`), context, {
    filename,
    lineOffset: options.lineOffset,
    displayErrors: true,
  });
  compiledWrapper.apply(context, [mod.exports, extendedRequire, mod, filename, path.dirname(filename)]);

  let result = mod.exports;
  if (isPromise(result)) {
    result = await result;
  } else {
    for (const [key, value] of Object.entries(result)) {
      if (isPromise(value)) {
        result[key] = await value;
      }
    }
  }
  return result;
}

export async function evalExpression(expression: string, context: ProcessorContext): Promise<unknown> {
  const script = `exports.$result = (${expression});`;
  let lineOffset = context.httpRegion.symbol.startLine;
  if (context.httpRegion.symbol.source) {
    const index = toMultiLineArray(context.httpRegion.symbol.source).findIndex(line => line.indexOf(expression) >= 0);
    if (index >= 0) {
      lineOffset += index;
    }
  }
  const value = await runScript(script, {
    fileName: context.httpFile.fileName,
    context: {
      httpFile: context.httpFile,
      httpRegion: context.httpRegion,
      console: context.scriptConsole,
      ...context.variables,
    },
    lineOffset,
  });
  return value.$result;
}

export const JAVASCRIPT_KEYWORDS = [
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'super',
  'switch',
  'static',
  'this',
  'throw',
  'try',
  'true',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
];

export function isValidVariableName(name: string): boolean {
  if (JAVASCRIPT_KEYWORDS.indexOf(name) <= 0) {
    try {
      // eslint-disable-next-line no-new-func
      Function(`var ${name}`);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}
