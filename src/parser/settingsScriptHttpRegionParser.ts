
import {actionProcessorIndexAfterRequest } from '../utils';
import { HttpRegionAction, HttpRegionParser, HttpRegionParserResult, ParserContext, ProcessorContext } from '../models';
import { jsActionProcessor, ScriptData } from '../actionProcessor';


export class SettingsScriptHttpRegionParser implements HttpRegionParser{
  constructor(private readonly getScriptData: () => Promise<ScriptData | undefined>){}
  async parse(): Promise<HttpRegionParserResult>{
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.request) {
      const action: HttpRegionAction<() => Promise<ScriptData | undefined>> = {
        data: this.getScriptData,
        type: 'settings_js',
        processor: this.executeSettingsScript,
      };
      httpRegion.actions.splice(actionProcessorIndexAfterRequest(httpRegion), 0, action);
    }
  }

  async executeSettingsScript(data: () => Promise<ScriptData | undefined>, context: ProcessorContext): Promise<boolean> {
    const scriptData = await data();
    if (scriptData) {
      return await jsActionProcessor(scriptData, context);
    }
    return true;
  }
}
