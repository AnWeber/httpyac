import { Variables, ProcessorContext, HttpRegionAction, ActionType } from '../models';
import { Module } from 'module';
import { runInThisContext } from 'vm';
import { isPromise, toEnvironmentKey } from '../utils';
import * as got from 'got';
import { httpYacApi } from '../httpYacApi';
import * as httpYac from '..';
import { testFactory } from './testMethod';
import { fileProvider, PathLike, log } from '../io';

export interface ScriptData {
  script: string;
  lineOffset: number;
}

export const JAVASCRIPT_KEYWORDS = ['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'super', 'switch', 'static', 'this', 'throw', 'try', 'true', 'typeof', 'var', 'void', 'while', 'with', 'yield'];


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


export class JavascriptAction implements HttpRegionAction {
  type = ActionType.js;

  constructor(private readonly scriptData: ScriptData) { }

  async process(context: ProcessorContext): Promise<boolean> {
    const { httpRegion, httpFile, request, variables, progress, scriptConsole } = context;
    const defaultVariables = {
      request,
      httpRegion,
      httpFile,
      log,
      console: scriptConsole,
      test: testFactory(context),
    };
    Object.assign(variables, defaultVariables);

    const result = await executeScript({
      script: this.scriptData.script,
      fileName: httpFile.fileName,
      variables,
      lineOffset: this.scriptData.lineOffset + 1,
      require: {
        progress,
      },
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
}

export interface ScriptContext {
  script: string,
  fileName: PathLike | undefined,
  variables: Variables,
  lineOffset: number,
  require?: Record<string, unknown>,
}

export async function executeScript(context: ScriptContext): Promise<Variables> {
  try {
    const filename = context.fileName ? fileProvider.fsPath(context.fileName) : __filename;
    const dir = fileProvider.fsPath(fileProvider.dirname(filename));
    const scriptModule = new Module(filename, require.main);

    scriptModule.filename = filename;
    scriptModule.exports = {};

    // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L565-L640
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
    scriptModule.paths = (Module as any)._nodeModulePaths(dir);


    const scriptRequire = (id: string | undefined) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
    scriptRequire.resolve = (req: unknown) => (Module as any)._resolveFilename(req, scriptModule);

    const vars = Object.entries(context.variables).map(([key]) => key).join(', ').trim();

    // function call and content needs to be in one line for correct line number on error,
    // end of function needs to be in separated line, because of comments in last line of script
    const wrappedFunction = `(function userJS(exports, require, module, __filename, __dirname${vars.length > 0 ? `, ${vars}` : ''}){${context.script}
      })`;

    const compiledWrapper = runInThisContext(wrappedFunction, {
      filename,
      lineOffset: context.lineOffset,
      displayErrors: true,
    });
    compiledWrapper.apply(context.variables, [
      scriptModule.exports,
      scriptRequire,
      scriptModule,
      filename,
      dir,
      ...Object.entries(context.variables).map(([, value]) => value)
    ]);


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
