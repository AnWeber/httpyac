
import {pushAfter } from '../utils';
import { ActionType, HttpRegionParser, HttpRegionParserResult, ParserContext } from '../models';
import { GenericAction, JavascriptAction, ScriptData } from '../actions';


export class SettingsScriptHttpRegionParser implements HttpRegionParser{
  constructor(private readonly getScriptData: () => Promise<ScriptData | undefined>){}
  async parse(): Promise<HttpRegionParserResult>{
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.request) {
      pushAfter(httpRegion.actions, obj => obj.type === ActionType.request, new GenericAction('settings_js', async (context) => {
        const scriptData = await this.getScriptData();
        if (scriptData) {
          const javascriptAction = new JavascriptAction(scriptData);
          return await javascriptAction.process(context);
        }
        return true;
      }));
    }
  }
}
