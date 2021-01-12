import { HttpRegion, HttpFile } from '../httpRegion';
import { Module } from 'module';
import * as vm from 'vm';
import { dirname } from 'path';
import { log } from '../logger';
import { isPromise } from '../utils';
import * as got from 'got';
import { httpYacApi } from '../httpYacApi';
import { httpFileStore } from '../httpFileStore';
import { environmentStore } from '../environments';

export interface ScriptData{
  script: string;
  lineOffset: number;
}

export const JAVASCRIPT_KEYWORDS = ['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'super', 'switch', 'static', 'this', 'throw', 'try', 'true', 'typeof', 'var', 'void', 'while', 'with', 'yield'];

export async function jsActionProcessor(scriptData: ScriptData, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) {
  variables.httpRegion = httpRegion;
  let value = await executeScript(scriptData.script, httpFile.fileName, variables, scriptData.lineOffset + 1);
  if (value) {
    Object.assign(variables, value);
    Object.assign(httpFile.variables, value);
  }
}


export async function executeScript(script: string, fileName: string | undefined, variables: Record<string, any>, lineOffset:number) {
  try {
    fileName = fileName || __filename;
    const dir = dirname(fileName);
    const scriptModule = new Module(fileName, require.main);

    const argsName = ['exports', 'require', 'module', '__filename', '__dirname'];
    if (variables) {
      argsName.push(...Object.entries(variables).filter(([key]) => JAVASCRIPT_KEYWORDS.indexOf(key) < 0).map(([key]) => key));
    }

    const wrappedFunction = `(function userJS(${argsName.join(',')}){${script}})`;

    log.trace(wrappedFunction);

    scriptModule.filename = fileName;
    scriptModule.exports = {};
    // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L565-L640
    scriptModule.paths = (Module as any)._nodeModulePaths(dir);


    const scriptRequire: any = (id: any) => {
      if (id === 'got') {
        return got;
      }
      if (id === 'httpYac') {
        return {
          httpYacApi,
          environmentStore,
          httpFileStore,
        };
      }
      if (httpYacApi.additionalRequire[id]) {
        return httpYacApi.additionalRequire[id];
      }
      return scriptModule.require(id);
    };
    // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L823-L911
    scriptRequire.resolve = (req: any) => (Module as any)._resolveFilename(req, scriptModule);

    const scriptArgs = [scriptModule.exports, scriptRequire, scriptModule, fileName, dir];
    if (variables) {
      scriptArgs.push(...Object.entries(variables).filter(([key]) => JAVASCRIPT_KEYWORDS.indexOf(key) < 0).map(([key,value]) => value));
    }
    const compiledWrapper = vm.runInThisContext(wrappedFunction, {
      filename: fileName,
      lineOffset,
      displayErrors: true
    });
    compiledWrapper.apply(variables, scriptArgs);


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
    log.error(script, err);
    throw err;
  }
}

