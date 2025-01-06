import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import * as intellij from './api';

export interface IntellijScriptData {
  fileName: string;
}

export class IntellijAction {
  public id = 'intellij';

  public before: Array<string> | undefined;

  constructor(
    private scriptData: models.ScriptData | IntellijScriptData,
    beforeReqeust: boolean
  ) {
    if (beforeReqeust) {
      this.before = ['requestVariableReplacer'];
    }
  }

  private isStreamingScript(scriptData: models.ScriptData) {
    return ['onEachLine', 'onEachMessage'].some(obj => scriptData.script.indexOf(obj) > 0);
  }

  async processOnRequest(_request: models.Request, context: models.ProcessorContext): Promise<void> {
    utils.report(context, 'execute Intellij Javascript');
    const scriptData = await this.loadScript(context);
    if (this.isStreamingScript(scriptData)) {
      return;
    }

    const intellijVars = initIntellijVariables(context);
    await this.executeScriptData(scriptData, intellijVars, context);
  }

  async processOnStreaming(context: models.ProcessorContext): Promise<void> {
    const scriptData = await this.loadScript(context);
    this.scriptData = scriptData;
    if (this.isStreamingScript(scriptData) && context.requestClient) {
      const requestClient = context.requestClient;
      await new Promise<void>(resolve => {
        const intellijVars = initIntellijVariables(context);
        intellijVars.response = new intellij.IntellijTextStreamResponse(requestClient, resolve);
        this.executeScriptData(scriptData, intellijVars, context);
      });
    }
  }

  async processOnResponse(response: models.HttpResponse, context: models.ProcessorContext): Promise<void> {
    utils.report(context, 'execute Intellij Javascript');
    const scriptData = await this.loadScript(context);
    if (this.isStreamingScript(scriptData)) {
      return;
    }

    const intellijVars = initIntellijVariables(context);
    intellijVars.response = new intellij.IntellijHttpResponse(response);
    await this.executeScriptData(scriptData, intellijVars, context);
  }

  private async executeScriptData(
    scriptData: models.ScriptData,
    intellijVars: Record<string, unknown>,
    context: models.ProcessorContext
  ) {
    if (io.javascriptProvider.runScript) {
      await io.javascriptProvider.runScript(scriptData.script, {
        fileName: context.httpFile.fileName,
        context: {
          console: context.scriptConsole,
          ...intellijVars,
        },
        lineOffset: scriptData.lineOffset,
      });
      return true;
    }
    return false;
  }

  private async loadScript(context: models.ProcessorContext): Promise<models.ScriptData> {
    if (this.isIntellijScriptData(this.scriptData)) {
      try {
        return {
          script:
            (await utils.replaceFilePath(this.scriptData.fileName, context, path =>
              io.fileProvider.readFile(path, 'utf-8')
            )) || '',
          lineOffset: 0,
        };
      } catch (err) {
        (context.scriptConsole || io.log).error(this.scriptData.fileName, err);
        throw new Error(`error loading script ${this.scriptData.fileName}`);
      }
    } else {
      return this.scriptData;
    }
  }

  private isIntellijScriptData(scriptData: IntellijScriptData | models.ScriptData): scriptData is IntellijScriptData {
    const guard = scriptData as IntellijScriptData;
    return !!guard.fileName;
  }
}

function initIntellijVariables(context: models.ProcessorContext): intellij.IntellijJavascriptGlobal {
  const variables: intellij.IntellijJavascriptGlobal = {
    client: new intellij.IntellijHttpClient(context),
    crypto: new intellij.IntellijCryptoSupport(),
    $random: new intellij.IntellijRandom(),
    $env: process.env,
    Window: new intellij.IntellijWindow(),
  };
  if (context.request) {
    if (context.httpRegion.response) {
      variables.request = new intellij.IntellijHttpClientRequest(context);
    } else {
      variables.request = new intellij.IntellijPreRequestHttpClientRequest(context);
    }
  }
  return variables;
}
