import { ProcessorContext, HttpRegionAction, ActionType } from '../models';

import * as utils from '../utils';
import { testFactory } from './testMethod';

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
  id = ActionType.js;

  constructor(private readonly scriptData: ScriptData, public readonly after?: string[]) { }

  async process(context: ProcessorContext): Promise<boolean> {
    const { httpFile, request, variables } = context;

    const result = await utils.runScript(this.scriptData.script, {
      fileName: httpFile.fileName,
      context: {
        request,
        sleep: utils.sleep,
        test: testFactory(context),
        httpFile: context.httpFile,
        httpRegion: context.httpRegion,
        console: context.scriptConsole,
        ...variables,
      },
      lineOffset: this.scriptData.lineOffset,
      require: context.require,
    });
    if (result) {
      Object.assign(variables, result);
      const envKey = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
      if (!context.httpFile.variablesPerEnv[envKey]) {
        context.httpFile.variablesPerEnv[envKey] = {};
      }
      Object.assign(context.httpFile.variablesPerEnv[envKey], result);
    }
    return !result.$cancel;
  }
}
