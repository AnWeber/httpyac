import { Variables, ProcessorContext, HttpRegion, HttpFile, ActionType, HttpRegionAction } from '../models';
import { ScriptData, executeScript } from './javascriptAction';
import { log, popupService } from '../logger';
import { toAbsoluteFilename } from '../utils';
import { promises as fs } from 'fs';
import * as intellij from './intellij';

export interface IntellijScriptData{
  fileName: string;
}


export class IntellijAction implements HttpRegionAction {
  type = ActionType.intellij;

  constructor(private readonly scriptData: ScriptData | IntellijScriptData) { }

  async process({ httpRegion, httpFile, variables }: ProcessorContext): Promise<boolean> {
    const intellijVars = initIntellijVariables(httpRegion, variables, httpFile.activeEnvironment);

    let data: ScriptData;
    if (this.isIntellijScriptData(this.scriptData)) {
      const script = await this.loadScript(this.scriptData.fileName, httpFile);
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
      fileName: httpFile.fileName,
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
        script = await fs.readFile(filename, 'utf-8');
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


function initIntellijVariables(httpRegion: HttpRegion, variables: Variables, env: string[] | undefined) {
  let response: unknown;
  if (httpRegion.response) {
    response = new intellij.IntellijHttpResponse(httpRegion.response);
  }
  const client = new intellij.IntellijHttpClient(httpRegion, variables, env);
  return {
    client,
    response,
  };
}
