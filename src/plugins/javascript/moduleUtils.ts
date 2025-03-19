import Module from 'module';
import path from 'path';
import vm from 'vm';

import * as io from '../../io';
import { log } from '../../io';
import { PathLike, ProcessorContext } from '../../models';
import { randomData } from '../../utils';
import { isPromise } from '../../utils/promiseUtils';
import { toMultiLineArray } from '../../utils/stringUtils';

function resolveModule(request: string, context: string): string | undefined {
  let resolvedPath: string | undefined;
  try {
    try {
      resolvedPath = Module.createRequire(path.resolve(context, 'package.json')).resolve(request);
    } catch {
      resolvedPath = require.resolve(request, { paths: [context] });
    }
  } catch (e) {
    io.log.debug(e);
  }
  return resolvedPath;
}

export function loadModule<T>(request: string, context: string, force = false): T | undefined {
  if (io.userInteractionProvider.isTrusted('loadModule')) {
    try {
      if (force) {
        clearModule(request, context);
      }
      return Module.createRequire(path.resolve(context, 'package.json'))(request);
    } catch {
      const resolvedPath = resolveModule(request, context);
      if (resolvedPath) {
        if (force) {
          clearRequireCache(resolvedPath);
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(resolvedPath);
      }
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

function clearModule(request: string, context: string): void {
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
    deleteVariable?: (key: string) => void;
  }
): Promise<Record<string, unknown>> {
  if (!io.userInteractionProvider.isTrusted('runScript')) {
    return {};
  }
  const filename = toModuleFilename(options.fileName);

  const mod = createModule(filename);

  function extendedRequire(id: string) {
    const proivderRequire = io.javascriptProvider.require;
    if (proivderRequire && proivderRequire[id]) {
      return proivderRequire[id];
    }
    return mod.require(id);
  }

  const validContent = checkVariableNames(options.context);
  const context = Object.assign({
    $context: validContent,
    ...validContent,
  });

  const contextKeys = Object.keys(context);
  const sourceAsync = `(async function userJS(exports, require, module, __filename, __dirname, context){ with(context){${io.fileProvider.EOL}${source}${io.fileProvider.EOL}}})`;
  const compiledWrapper = vm.runInThisContext(sourceAsync, {
    filename,
    lineOffset: options.lineOffset,
    displayErrors: true,
  });
  await compiledWrapper.apply(context, [mod.exports, extendedRequire, mod, filename, path.dirname(filename), context]);

  deleteVariables(contextKeys, context, options.deleteVariable);

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
function toModuleFilename(fileName: PathLike) {
  return io.fileProvider.fsPath(fileName) || io.fileProvider.toString(fileName);
}

function deleteVariables(contextKeys: string[], context: vm.Context, deleteVariable?: (key: string) => void) {
  if (deleteVariable) {
    for (const key of contextKeys) {
      try {
        if (context[key] === undefined) {
          deleteVariable(key);
        }
      } catch (err) {
        log.info(`error on delete of ${key}`, err);
      }
    }
  }
}

export async function evalExpression(
  expression: string,
  context: ProcessorContext,
  scriptContext?: Record<string, unknown>
): Promise<unknown> {
  if (!io.userInteractionProvider.isTrusted('evalExpression')) {
    return undefined;
  }
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
      ...context.variables,
      httpFile: context.httpFile,
      httpRegion: context.httpRegion,
      request: context.request,
      console: context.scriptConsole,
      $random: randomData,
      ...scriptContext,
      $context: context,
    },
    lineOffset,
  });
  return value.$result;
}

function checkVariableNames(context: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    const name = key
      .trim()
      .replace(/\s/gu, '-')
      .replace(/-./gu, val => val[1].toUpperCase());
    if (JAVASCRIPT_KEYWORDS.indexOf(name) < 0 && typeof value !== 'undefined') {
      result[name] = value;
    }
  }
  return result;
}

export function isAllowedKeyword(key: string) {
  if (JAVASCRIPT_KEYWORDS.indexOf(key) >= 0) {
    log.warn(`Keyword ${key} prevented, because Javascript Keyword`);
    return false;
  }
  if (HTTPYAC_KEYWORDS.indexOf(key) >= 0) {
    log.warn(`Keyword ${key} prevented, because used by httpYac`);
    return false;
  }
  return true;
}

export const HTTPYAC_KEYWORDS = ['httpFile', 'httpRegion', 'request', 'test', 'sleep'];

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
