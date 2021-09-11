import * as models from '../models';
import { replaceVariables } from './variableAction';
import { isString } from '../utils';


export class VariableReplacerAction implements models.HttpRegionAction {
  id = models.ActionType.variableReplacer;


  async process(context: models.ProcessorContext): Promise<boolean> {
    if (context.request) {
      if (context.request.url) {
        const result = await replaceVariables(context.request.url, models.VariableType.url, context) || context.request.url;
        if (result === models.HookCancel) {
          return false;
        }
        if (isString(result)) {
          context.request.url = result;
        }
      }
      if (await this.replaceVariablesInBody(context.request, context) === false) {
        return false;
      }
      return await this.replaceVariablesInHeader(context.request, context);
    }
    return true;
  }

  private async replaceVariablesInBody(replacedReqeust: models.Request, context: models.ProcessorContext) : Promise<boolean> {
    if (replacedReqeust.body) {
      if (isString(replacedReqeust.body)) {
        const result = await replaceVariables(replacedReqeust.body, models.VariableType.body, context);
        if (result === models.HookCancel) {
          return false;
        }
        if (isString(result) || Buffer.isBuffer(result)) {
          replacedReqeust.body = result;
        }
      } else if (Array.isArray(replacedReqeust.body)) {
        const replacedBody: Array<models.HttpRequestBodyLine> = [];
        for (const obj of replacedReqeust.body) {
          if (isString(obj)) {
            const result = await replaceVariables(obj, models.VariableType.body, context);
            if (result === models.HookCancel) {
              return false;
            }
            if (isString(result)) {
              replacedBody.push(result);
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

  private async replaceVariablesInHeader(request: models.Request, context: models.ProcessorContext) : Promise<boolean> {
    if (request.headers) {
      for (const [headerName, headerValue] of Object.entries(request.headers)) {
        const value = await replaceVariables(headerValue, headerName, context);
        if (value === models.HookCancel) {
          return false;
        }
        request.headers[headerName] = value;
      }
    }
    return true;
  }

}
