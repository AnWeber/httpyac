import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../models';
import * as utils from '../../utils';
import { HttpyacJsApi } from './httpyacJsApi';
import { runScript } from './moduleUtils';

const JavaScriptStart =
  /^\s*\{\{(@js\s+)?(?<modifier>\+|@)?(?<event>(request|streaming|response|after|responseLogging)?)?\s*$/iu;
const JavaScriptEnd = /^\s*\}\}\s*$/u;

export interface ScriptData {
  script: string;
  lineOffset: number;
}

export async function parseJavascript(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion, httpFile, httpFileStore }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  let next = lineReader.next();

  if (!next.done) {
    const match = JavaScriptStart.exec(next.value.textLine);
    if (match?.groups) {
      const lineOffset = next.value.line;
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {
        if (JavaScriptEnd.test(next.value.textLine)) {
          const scriptData: ScriptData = {
            script: utils.toMultiLineString(script),
            lineOffset,
          };
          const isOnEveryRequest = match.groups.modifier === '+';

          switch (match.groups.event) {
            case 'request':
              addRequestHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData, httpFileStore);
              break;
            case 'streaming':
              addStreamingHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData, httpFileStore);
              break;
            case 'response':
              addResponseHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData, httpFileStore);
              break;
            case 'after':
              addExecuteAfterInterceptor(
                isOnEveryRequest ? httpFile.hooks : httpRegion.hooks,
                scriptData,
                httpFileStore
              );
              break;
            case 'responseLogging':
              addResponseLoggingHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData, httpFileStore);
              break;
            default:
              addExecuteHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData, httpFileStore);
              break;
          }

          return {
            nextParserLine: next.value.line,
            symbols: [
              new models.HttpSymbol({
                name: 'script',
                description: 'nodejs script',
                kind: models.HttpSymbolKind.script,
                startLine: lineOffset,
                startOffset: 0,
                endLine: next.value.line,
                endOffset: next.value.textLine.length,
              }),
            ],
          };
        }
        script.push(next.value.textLine);
        next = lineReader.next();
      }
    }
  }
  return false;
}

function addStreamingHook(
  hooks: { onStreaming: models.OnStreaming },
  scriptData: ScriptData,
  httpFileStore: models.HttpFileStore
) {
  hooks.onStreaming.addHook('js', async context => {
    const result = await executeScriptData(scriptData, context, httpFileStore, 'streaming');
    return result ? undefined : models.HookCancel;
  });
}

function addExecuteHook(
  hooks: { execute: models.ExecuteHook },
  scriptData: ScriptData,
  httpFileStore: models.HttpFileStore
) {
  hooks.execute.addHook('js', context => executeScriptData(scriptData, context, httpFileStore));
}
function addRequestHook(
  hooks: { onRequest: models.OnRequestHook },
  scriptData: ScriptData,
  httpFileStore: models.HttpFileStore
) {
  hooks.onRequest.addHook('js', async (_request, context) => {
    const result = await executeScriptData(scriptData, context, httpFileStore, 'request');
    return result ? undefined : models.HookCancel;
  });
}

function addResponseHook(
  hooks: { onResponse: models.OnResponseHook },
  scriptData: ScriptData,
  httpFileStore: models.HttpFileStore
) {
  hooks.onResponse.addHook('js', async (response, context) => {
    context.variables.response = response;
    const result = await executeScriptData(scriptData, context, httpFileStore, 'response');
    return result ? undefined : models.HookCancel;
  });
}
function addResponseLoggingHook(
  hooks: { responseLogging: models.ResponseLoggingHook },
  scriptData: ScriptData,
  httpFileStore: models.HttpFileStore
) {
  hooks.responseLogging.addHook('js', async (response, context) => {
    const originalResponse = context.variables.response;
    context.variables.response = response;
    await executeScriptData(scriptData, context, httpFileStore, 'responseLogging');
    context.variables.response = originalResponse;
  });
}

function addExecuteAfterInterceptor(
  hooks: { execute: models.ExecuteHook },
  scriptData: ScriptData,
  httpFileStore: models.HttpFileStore
) {
  hooks.execute.addInterceptor(new AfterJavascriptHookInterceptor(scriptData, httpFileStore));
}

export class AfterJavascriptHookInterceptor implements HookInterceptor<[models.ProcessorContext], boolean> {
  id: string;
  constructor(
    private readonly scriptData: ScriptData,
    private readonly httpFileStore: models.HttpFileStore
  ) {
    this.id = `afterJavascript_${scriptData.script}`;
  }
  async afterLoop(
    context: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    return await executeScriptData(this.scriptData, context.args[0], this.httpFileStore, 'after');
  }
}
async function executeScriptData(
  scriptData: ScriptData,
  context: models.ProcessorContext,
  httpFileStore: models.HttpFileStore,
  eventName?: string
) {
  utils.report(context, eventName ? `execute javascript (@${eventName})` : 'execute javascript');
  const result = await runScript(scriptData.script, {
    fileName: context.httpFile.fileName,
    context: {
      ...context.variables,
      httpFile: context.httpFile,
      httpRegion: context.httpRegion,
      request: context.request,
      console: context.scriptConsole,
      sleep: utils.sleep,
      test: utils.testFactory(context),
      $httpyac: new HttpyacJsApi(context, httpFileStore),
      $random: utils.randomData,
      $context: context,
    },
    lineOffset: scriptData.lineOffset,
    deleteVariable: (key: string) => utils.deleteVariableInContext(key, context),
  });
  const cancel = result.$cancel;

  if (cancel) {
    delete result.$cancel;
    utils.addSkippedTestResult(context.httpRegion);
  }
  utils.setVariableInContext(result, context);
  return !cancel;
}
