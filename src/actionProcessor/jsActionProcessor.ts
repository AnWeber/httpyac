import { Variables, ProcessorContext } from '../models';
import { Module } from 'module';
import { runInThisContext} from 'vm';
import { dirname } from 'path';
import { log, scriptConsole} from '../logger';
import { isPromise , toEnvironmentKey} from '../utils';
import * as got from 'got';
import { httpYacApi } from '../httpYacApi';
import * as httpYac from '..';
import { test } from './testMethod';

export interface ScriptData{
  script: string;
  lineOffset: number;
}

export const JAVASCRIPT_KEYWORDS = ['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'super', 'switch', 'static', 'this', 'throw', 'try', 'true', 'typeof', 'var', 'void', 'while', 'with', 'yield'];


export function isValidVariableName(name: string) {
  if (JAVASCRIPT_KEYWORDS.indexOf(name) <= 0) {
    try {
      Function(`var ${name}`);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

export async function jsActionProcessor(scriptData: ScriptData, { httpRegion, httpFile, request, variables, progress }: ProcessorContext) {

  const defaultVariables = {
    request,
    httpRegion,
    httpFile,
    log,
    console: scriptConsole,
    test,
  };
  Object.assign(variables, defaultVariables);

  const result = await executeScript({
    script: scriptData.script,
    fileName: httpFile.fileName,
    variables,
    lineOffset: scriptData.lineOffset + 1,
    require: {
      progress,
    }
  });
  for (const [key] of Object.entries(defaultVariables)) {
    delete variables[key];
  }
  if (result) {
    Object.assign(variables, result);
    Object.assign(httpFile.variablesPerEnv[toEnvironmentKey(httpFile.activeEnvironment)], result);
  }
  return !result.$cancel;
}



export async function executeScript(context: { script: string, fileName: string | undefined, variables: Variables, lineOffset: number, require?: Record<string, any>}) {
  try {
    const filename = context.fileName || __filename;
    const dir = dirname(filename);
    const scriptModule = new Module(filename, require.main);

    scriptModule.filename = filename;
    scriptModule.exports = {};
    // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L565-L640
    scriptModule.paths = (Module as any)._nodeModulePaths(dir);


    const scriptRequire: any = (id: string | undefined) => {
      if (id) {
        if (id === 'got') {
          return got;
        }
        if (id === 'httpyac') {
          return {
            ...httpYac,
            ...context.require || {},
          };
        }
        if (httpYacApi.additionalRequire[id]) {
          return httpYacApi.additionalRequire[id];
        }
        return scriptModule.require(id);
      }
      return null;
    };
    // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L823-L911
    scriptRequire.resolve = (req: any) => (Module as any)._resolveFilename(req, scriptModule);

    const vars = Object.entries(context.variables).map(([key]) => key).join(', ').trim();
    const wrappedFunction = `(function userJS(exports, require, module, __filename, __dirname${vars.length > 0 ? `, ${vars}` : ''}){${context.script}})`;

    const compiledWrapper = runInThisContext(wrappedFunction, {
      filename,
      lineOffset: context.lineOffset,
      displayErrors: true,
    });
    compiledWrapper.apply(context.variables, [scriptModule.exports, scriptRequire, scriptModule, filename, dir, ...Object.entries(context.variables).map(([,value]) => value)]);


    let result = scriptModule.exports;
    if (isPromise(scriptModule.exports)) {
      result = await scriptModule.exports;
    } else {
      for (const [key, value] of Object.entries(result)) {
        if (isPromise(value)) {
          result[key] = await value;
        }
      }
    }
    return result;
  } catch (err) {
    log.error(`js: ${context.script}`);
    throw err;
  }
}

