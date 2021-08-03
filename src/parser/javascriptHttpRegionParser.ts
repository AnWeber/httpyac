import { testFactory } from '../actions';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';


export interface ScriptData {
  script: string;
  lineOffset: number;
}

export async function parseJavascript(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion, data }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  let next = lineReader.next();

  if (!next.done) {
    const match = ParserRegex.javascript.scriptStart.exec(next.value.textLine);
    if (!match) {
      return false;
    }
    const lineOffset = next.value.line;
    next = lineReader.next();
    const script: Array<string> = [];
    while (!next.done) {

      if (ParserRegex.javascript.scriptEnd.test(next.value.textLine)) {
        const scriptData: ScriptData = {
          script: utils.toMultiLineString(script),
          lineOffset,
        };

        if (!match.groups?.executeOnEveryRequest) {
          httpRegion.hooks.execute.addObjHook(obj => obj.process, new JavascriptAction(scriptData));
        } else {

          let onEveryRequestArray = data.jsOnEveryRequest;
          if (!onEveryRequestArray) {
            data.jsOnEveryRequest = onEveryRequestArray = [];
          }
          onEveryRequestArray.push({
            scriptData,
            postScript: ['+after', '+post'].indexOf(match.groups?.executeOnEveryRequest) >= 0,
          });
        }

        return {
          nextParserLine: next.value.line,
          symbols: [{
            name: 'script',
            description: 'nodejs script',
            kind: models.HttpSymbolKind.script,
            startLine: lineOffset,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
          }]
        };
      }
      script.push(next.value.textLine);
      next = lineReader.next();
    }
  }
  return false;
}

export async function injectOnEveryRequestJavascript({ data, httpRegion }: models.ParserContext): Promise<void> {
  const onEveryRequestArray = data.jsOnEveryRequest;
  if (onEveryRequestArray && httpRegion.request) {
    for (const everyRequestScript of onEveryRequestArray) {
      if (everyRequestScript.postScript) {
        httpRegion.hooks.execute.addObjHook(obj => obj.process, new JavascriptAction(everyRequestScript.scriptData));
      } else {
        httpRegion.hooks.execute.addObjHook(obj => obj.process, new JavascriptAction(everyRequestScript.scriptData, [models.ActionType.requestBodyImport]));
      }
    }
  }
}


export class JavascriptAction implements models.HttpRegionAction {
  id = models.ActionType.js;

  constructor(private readonly scriptData: ScriptData, public readonly after?: string[]) { }

  async process(context: models.ProcessorContext): Promise<boolean> {
    const { httpFile, request, variables } = context;

    const result = await utils.runScript(this.scriptData.script, {
      fileName: httpFile.fileName,
      context: {
        request,
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
