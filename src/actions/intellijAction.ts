import { ProcessorContext, HttpFile, ActionType, HttpRegionAction } from '../models';
import { ScriptData, executeScript } from './javascriptAction';
import { log, popupService } from '../logger';
import { toAbsoluteFilename } from '../utils';
import { fileProvider } from '../fileProvider';


import * as intellij from './intellij';

export interface IntellijScriptData{
  fileName: string;
}


export class IntellijAction implements HttpRegionAction {
  type = ActionType.intellij;

  constructor(private readonly scriptData: ScriptData | IntellijScriptData) { }

  async process(context: ProcessorContext): Promise<boolean> {
    const intellijVars = initIntellijVariables(context);

    let data: ScriptData;
    if (this.isIntellijScriptData(this.scriptData)) {
      const script = await this.loadScript(this.scriptData.fileName, context.httpFile);
      if (!script) {
        return false;
      }
      data = {
        script,
        lineOffset: 0
      };
    } else {
      data = this.scriptData;
    }
    await executeScript({
      script: data.script,
      fileName: context.httpFile.fileName,
      variables: intellijVars,
      lineOffset: data.lineOffset + 1
    });
    return true;
  }


  private async loadScript(file: string, httpFile: HttpFile) {
    try {
      let script: string | false = false;
      const filename = await toAbsoluteFilename(file, httpFile.fileName);
      if (filename) {
        script = await fileProvider.readFile(filename, 'utf-8');
      } else {
        popupService.error(`File not found: ${file}`);
        log.error(`File not found: ${file}`);
      }
      return script;
    } catch (err) {
      popupService.error(`error loading script ${file}`);
      log.error(file, err);
      return false;
    }
  }

  private isIntellijScriptData(scriptData: IntellijScriptData | ScriptData): scriptData is IntellijScriptData {
    const guard = scriptData as IntellijScriptData;
    return !!guard.fileName;
  }
}


function initIntellijVariables(context: ProcessorContext) {
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
