
import {actionProcessorIndexAfterRequest } from '../utils';
import { HttpRegionParser, HttpRegionParserResult, ParserContext, ProcessorContext } from '../models';
import { jsActionProcessor, ScriptData } from '../actionProcessor';


export class SettingsScriptHttpRegionParser implements HttpRegionParser{
  constructor(private readonly getScriptData: () => Promise<ScriptData | undefined>){}
  async parse(lineReader: unknown, context: ParserContext): Promise<HttpRegionParserResult>{
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.request) {
      httpRegion.actions.splice(actionProcessorIndexAfterRequest(httpRegion), 0, {
        type: 'settings_js',
        processor: this.executeSettingsScript,
      });
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
