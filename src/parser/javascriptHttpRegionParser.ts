import * as httpyac from '..';
import { testFactory } from '../actions';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import * as grpc from '@grpc/grpc-js';
import { default as chalk } from 'chalk';
import { default as got } from 'got';

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

          if (!match.groups.modifier || match.groups.modifier === '@') {
            switch (match.groups.event) {
              case 'request':
                httpRegion.hooks.onRequest.addHook(models.ActionType.js, async (_request, context) => {
                  await executeScriptData(scriptData, context, 'request');
                });
                break;
              case 'streaming':
                httpRegion.hooks.onStreaming.addHook(models.ActionType.js, async context => {
                  await executeScriptData(scriptData, context, 'streaming');
                });
                break;
              case 'response':
                httpRegion.hooks.onResponse.addHook(models.ActionType.js, async (response, context) => {
                  context.variables.response = response;
                  await executeScriptData(scriptData, context, 'response');
                });
                break;
              case 'after':
                httpRegion.hooks.execute.addInterceptor(new AfterJavascriptHookInterceptor(scriptData));
                break;
              case 'responseLogging':
                httpRegion.hooks.responseLogging.addHook(models.ActionType.js, async (response, context) => {
                  const originalResponse = context.variables.response;
                  context.variables.response = response;
                  await executeScriptData(scriptData, context, 'responseLogging');
                  context.variables.response = originalResponse;
                });
                break;
              default:
                httpRegion.hooks.execute.addHook(models.ActionType.js, context =>
                  executeScriptData(scriptData, context)
                );
                break;
            }
          } else if (match.groups.modifier === '+') {
            let onEveryRequestArray = data.jsOnEveryRequest;
            if (!onEveryRequestArray) {
              data.jsOnEveryRequest = onEveryRequestArray = [];
            }
            onEveryRequestArray.push({
              scriptData,
              event: match.groups.event,
            });
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

export async function injectOnEveryRequestJavascript({ data, httpRegion }: models.ParserContext): Promise<void> {
  const onEveryRequestArray = data.jsOnEveryRequest;
  if (onEveryRequestArray && httpRegion.request) {
    for (const everyRequestScript of onEveryRequestArray) {
      const scriptData = everyRequestScript.scriptData;
      switch (everyRequestScript.event) {
        case 'streaming':
          httpRegion.hooks.onStreaming.addHook(models.ActionType.js, async context => {
            await executeScriptData(scriptData, context, 'streaming');
          });
          break;
        case 'response':
          httpRegion.hooks.onResponse.addHook(models.ActionType.js, async (response, context) => {
            context.variables.response = response;
            await executeScriptData(scriptData, context, 'response');
          });
          break;
        case 'after':
          httpRegion.hooks.execute.addHook(models.ActionType.js, async context => {
            await executeScriptData(scriptData, context, 'after');
          });
          break;
        case 'request':
          httpRegion.hooks.onRequest.addHook(models.ActionType.js, async (_request, context) => {
            await executeScriptData(scriptData, context, 'request');
          });
          break;
        case 'responseLogging':
          httpRegion.hooks.responseLogging.addHook(models.ActionType.js, async (response, context) => {
            const originalResponse = context.variables.response;
            context.variables.response = response;
            await executeScriptData(scriptData, context, 'responseLogging');
            context.variables.response = originalResponse;
          });
          break;
        default:
          httpRegion.hooks.execute.addInterceptor(new BeforeJavascriptHookInterceptor(everyRequestScript.scriptData));
          break;
      }
    }
  }
}

export class BeforeJavascriptHookInterceptor implements models.HookInterceptor<models.ProcessorContext, boolean> {
  constructor(private readonly scriptData: ScriptData) {}
  async beforeTrigger(
    context: models.HookTriggerContext<models.ProcessorContext, boolean | undefined>
  ): Promise<boolean | undefined> {
    return await executeScriptData(this.scriptData, context.arg, 'before');
  }
}
export class AfterJavascriptHookInterceptor implements models.HookInterceptor<models.ProcessorContext, boolean> {
  constructor(private readonly scriptData: ScriptData) {}
  async afterTrigger(
    context: models.HookTriggerContext<models.ProcessorContext, boolean | undefined>
  ): Promise<boolean | undefined> {
    return await executeScriptData(this.scriptData, context.arg, 'after');
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
