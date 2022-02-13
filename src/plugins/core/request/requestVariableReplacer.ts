import * as models from '../../../models';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

export async function requestVariableReplacer(
  request: models.Request,
  context: models.ProcessorContext
): Promise<void | typeof HookCancel> {
  utils.report(context, 'replace variables in request');
  if (request.url) {
    const result = (await utils.replaceVariables(request.url, models.VariableType.url, context)) || request.url;
    if (result === HookCancel) {
      return HookCancel;
    }
    if (utils.isString(result)) {
      request.url = result;
    }
  }
  if ((await replaceVariablesInBody(request, context)) === false) {
    return HookCancel;
  }
  if ((await replaceVariablesInHeader(request, context)) === false) {
    return HookCancel;
  }
  return undefined;
}

async function replaceVariablesInBody(
  replacedRequest: models.Request,
  context: models.ProcessorContext
): Promise<boolean> {
  if (replacedRequest.body) {
    if (utils.isString(replacedRequest.body)) {
      const result = await utils.replaceVariables(replacedRequest.body, models.VariableType.body, context);
      if (result === HookCancel) {
        return false;
      }
      if (utils.isString(result) || Buffer.isBuffer(result)) {
        replacedRequest.body = result;
      }
    } else if (Array.isArray(replacedRequest.body)) {
      const replacedBody: Array<models.HttpRequestBodyLine> = [];
      for (const obj of replacedRequest.body) {
        if (utils.isString(obj)) {
          const result = await utils.replaceVariables(obj, models.VariableType.body, context);
          if (result === HookCancel) {
            return false;
          }
          if (utils.isString(result)) {
            replacedBody.push(result);
          }
        } else {
          replacedBody.push(obj);
        }
      }
      replacedRequest.body = replacedBody;
    }
  }
  return true;
}

async function replaceVariablesInHeader(request: models.Request, context: models.ProcessorContext): Promise<boolean> {
  if (request.headers) {
    for (const [headerName, headerValue] of Object.entries(request.headers)) {
      if (Array.isArray(headerValue)) {
        const result = [];
        for (const headerVal of headerValue) {
          const value = await utils.replaceVariables(headerVal, headerName, context);
          if (value === HookCancel) {
            return false;
          }
          result.push(value);
        }
        request.headers[headerName] = result;
      } else {
        const value = await utils.replaceVariables(headerValue, headerName, context);
        if (value === HookCancel) {
          return false;
        }
        request.headers[headerName] = value;
      }
    }
  }
  return true;
}
