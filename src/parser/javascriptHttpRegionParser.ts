import * as httpyac from '..';
import { testFactory } from '../actions';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import * as grpc from '@grpc/grpc-js';
import { default as chalk } from 'chalk';
import { default as got } from 'got';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';

export interface ScriptData {
  script: string;
  lineOffset: number;
}

export async function parseJavascript(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion, httpFile }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  let next = lineReader.next();

  if (!next.done) {
    const match = ParserRegex.javascript.scriptStart.exec(next.value.textLine);
    if (match?.groups) {
      const lineOffset = next.value.line;
      next = lineReader.next();
      const script: Array<string> = [];
      while (!next.done) {
        if (ParserRegex.javascript.scriptEnd.test(next.value.textLine)) {
          const scriptData: ScriptData = {
            script: utils.toMultiLineString(script),
            lineOffset,
          };
          const isOnEveryRequest = match.groups?.modifier === '+';

          switch (match.groups.event) {
            case 'request':
              addRequestHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData);
              break;
            case 'streaming':
              addStreamingHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData);
              break;
            case 'response':
              addResponseHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData);
              break;
            case 'after':
              addExecuteAfterInterceptor(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData);
              break;
            case 'responseLogging':
              addResponseLoggingHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData);
              break;
            default:
              addExecuteHook(isOnEveryRequest ? httpFile.hooks : httpRegion.hooks, scriptData);
              break;
          }

          return {
            nextParserLine: next.value.line,
            symbols: [
              {
                name: 'script',
                description: 'nodejs script',
                kind: models.HttpSymbolKind.script,
                startLine: lineOffset,
                startOffset: 0,
                endLine: next.value.line,
                endOffset: next.value.textLine.length,
              },
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

function addStreamingHook(hooks: { onStreaming: models.OnStreaming }, scriptData: ScriptData) {
  hooks.onStreaming.addHook(models.ActionType.js, async context => {
    await executeScriptData(scriptData, context, 'streaming');
  });
}

function addExecuteHook(hooks: { execute: models.ExecuteHook }, scriptData: ScriptData) {
  hooks.execute.addHook(models.ActionType.js, context => executeScriptData(scriptData, context));
}
function addRequestHook(hooks: { onRequest: models.OnRequestHook }, scriptData: ScriptData) {
  hooks.onRequest.addHook(models.ActionType.js, async (_request, context) => {
    await executeScriptData(scriptData, context, 'request');
  });
}

function addResponseHook(hooks: { onResponse: models.OnResponseHook }, scriptData: ScriptData) {
  hooks.onResponse.addHook(models.ActionType.js, async (response, context) => {
    context.variables.response = response;
    await executeScriptData(scriptData, context, 'response');
  });
}
function addResponseLoggingHook(hooks: { responseLogging: models.ResponseLoggingHook }, scriptData: ScriptData) {
  hooks.responseLogging.addHook(models.ActionType.js, async (response, context) => {
    const originalResponse = context.variables.response;
    context.variables.response = response;
    await executeScriptData(scriptData, context, 'responseLogging');
    context.variables.response = originalResponse;
  });
}

function addExecuteAfterInterceptor(hooks: { execute: models.ExecuteHook }, scriptData: ScriptData) {
  hooks.execute.addInterceptor(new AfterJavascriptHookInterceptor(scriptData));
}

export class AfterJavascriptHookInterceptor implements HookInterceptor<[models.ProcessorContext], boolean> {
  constructor(private readonly scriptData: ScriptData) {}
  async afterLoop(
    context: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    return await executeScriptData(this.scriptData, context.args[0], 'after');
  }
}
async function executeScriptData(scriptData: ScriptData, context: models.ProcessorContext, eventName?: string) {
  utils.report(context, eventName ? `execute javascript (@${eventName})` : 'execute javascript');
  const result = await utils.runScript(scriptData.script, {
    fileName: context.httpFile.fileName,
    context: {
      request: context.request,
      sleep: utils.sleep,
      test: testFactory(context),
      httpFile: context.httpFile,
      httpRegion: context.httpRegion,
      console: context.scriptConsole,
      ...context.variables,
    },
    lineOffset: scriptData.lineOffset,
    require: {
      httpyac,
      chalk,
      got,
      '@grpc/grpc-js': grpc,
      ...context.require,
    },
  });
  if (result) {
    utils.setVariableInContext(result, context);
  }
  return !result.$cancel;
}
