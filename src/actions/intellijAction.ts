import { fileProvider, userInteractionProvider, log } from '../io';
import * as models from '../models';
import * as utils from '../utils';
import * as intellij from './intellij';

export interface IntellijScriptData {
  fileName: string;
}

export class IntellijAction implements models.HttpRegionAction {
  id = models.ActionType.intellij;

  constructor(private readonly scriptData: models.ScriptData | IntellijScriptData) {}

  async process(context: models.ProcessorContext): Promise<boolean> {
    const intellijVars = initIntellijVariables(context);

    let data: models.ScriptData;
    if (this.isIntellijScriptData(this.scriptData)) {
      const script = await this.loadScript(this.scriptData.fileName, context);
      if (!script) {
        return false;
      }
      data = {
        script,
        lineOffset: 0,
      };
    } else {
      data = this.scriptData;
    }

    utils.report(context, 'execute intellij javascript');
    await utils.runScript(data.script, {
      fileName: context.httpFile.fileName,
      context: {
        console: context.scriptConsole,
        ...intellijVars,
      },
      lineOffset: data.lineOffset,
    });
    return true;
  }

  private async loadScript(file: string, context: models.ProcessorContext) {
    try {
      return await utils.replaceFilePath(file, context, path => fileProvider.readFile(path, 'utf-8'));
    } catch (err) {
      userInteractionProvider.showErrorMessage?.(`error loading script ${file}`);
      log.error(file, err);
      return false;
    }
  }

  private isIntellijScriptData(scriptData: IntellijScriptData | models.ScriptData): scriptData is IntellijScriptData {
    const guard = scriptData as IntellijScriptData;
    return !!guard.fileName;
  }
}

function initIntellijVariables(context: models.ProcessorContext) {
  let response: unknown;
  if (context.httpRegion.response) {
    response = new intellij.IntellijHttpResponse(context.httpRegion.response);
  }
  const client = new intellij.IntellijHttpClient(context);
  return {
    client,
    response,
  };
}
