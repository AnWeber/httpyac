import { ActionType, HttpRegionAction, HttpRequest, HttpRequestBodyLine, ProcessorContext, VariableType, HookCancel } from '../models';
import { replaceVariables } from './variableAction';
import { isString } from '../utils';


export class VariableReplacerAction implements HttpRegionAction {
  id = ActionType.variableReplacer;


  async process(context: ProcessorContext): Promise<boolean> {
    if (context.request) {


      if (context.request.url) {
        const result = await replaceVariables(context.request.url, VariableType.url, context) || context.request.url;
        if (result === HookCancel) {
          return false;
        }
        context.request.url = result;
      }
      if (await this.replaceVariablesInBody(context.request, context) === false) {
        return false;
      }
      return await this.replaceVariablesInHeader(context.request, context);
    }
    return true;
  }

  private async replaceVariablesInBody(replacedReqeust: HttpRequest, context: ProcessorContext) : Promise<boolean> {
    if (replacedReqeust.body) {
      if (isString(replacedReqeust.body)) {
        const replacedVariable = await replaceVariables(replacedReqeust.body, VariableType.body, context);
        if (replacedVariable === HookCancel) {
          return false;
        }
        replacedReqeust.body = replacedVariable;
      } else if (Array.isArray(replacedReqeust.body)) {
        const replacedBody: Array<HttpRequestBodyLine> = [];
        for (const obj of replacedReqeust.body) {
          if (isString(obj)) {
            const replacedVariable = await replaceVariables(obj, VariableType.body, context);
            if (replacedVariable === HookCancel) {
              return false;
            }
            if (replacedVariable) {
              replacedBody.push(replacedVariable);
            }
          } else {
            replacedBody.push(obj);
          }
        }
        replacedReqeust.body = replacedBody;
      }
    }
    return true;
  }

  private async replaceVariablesInHeader(replacedReqeust: HttpRequest, context: ProcessorContext) : Promise<boolean> {
    if (replacedReqeust.headers) {
      for (const [headerName, headerValue] of Object.entries(replacedReqeust.headers)) {
        if (isString(headerValue)) {
          const value = await replaceVariables(headerValue, headerName, context);
          if (value === HookCancel) {
            return false;
          }
          replacedReqeust.headers[headerName] = value;

        }
      }
    }
    return true;
  }

}
