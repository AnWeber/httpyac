import * as models from '../models';
import * as utils from '../utils';

export async function requestVariableReplacer(
  request: models.Request,
  context: models.ProcessorContext
): Promise<models.Request | typeof models.HookCancel> {
  utils.report(context, 'replace variables in request');
  if (request.url) {
    const result = (await utils.replaceVariables(request.url, models.VariableType.url, context)) || request.url;
    if (result === models.HookCancel) {
      return models.HookCancel;
    }
    if (utils.isString(result)) {
      request.url = result;
    }
  }
  if ((await replaceVariablesInBody(request, context)) === false) {
    return models.HookCancel;
  }
  if ((await replaceVariablesInHeader(request, context)) === false) {
    return models.HookCancel;
  }
  return request;
}

async function replaceVariablesInBody(
  replacedReqeust: models.Request,
  context: models.ProcessorContext
): Promise<boolean> {
  if (replacedReqeust.body) {
    if (utils.isString(replacedReqeust.body)) {
      const result = await utils.replaceVariables(replacedReqeust.body, models.VariableType.body, context);
      if (result === models.HookCancel) {
        return false;
      }
      if (utils.isString(result) || Buffer.isBuffer(result)) {
        replacedReqeust.body = result;
      }
    } else if (Array.isArray(replacedReqeust.body)) {
      const replacedBody: Array<models.HttpRequestBodyLine> = [];
      for (const obj of replacedReqeust.body) {
        if (utils.isString(obj)) {
          const result = await utils.replaceVariables(obj, models.VariableType.body, context);
          if (result === models.HookCancel) {
            return false;
          }
          if (utils.isString(result)) {
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

async function replaceVariablesInHeader(request: models.Request, context: models.ProcessorContext): Promise<boolean> {
  if (request.headers) {
    for (const [headerName, headerValue] of Object.entries(request.headers)) {
      if (Array.isArray(headerValue)) {
        const result = [];
        for (const headerVal of headerValue) {
          const value = await utils.replaceVariables(headerVal, headerName, context);
          if (value === models.HookCancel) {
            return false;
          }
          result.push(value);
        }
        request.headers[headerName] = result;
      } else {
        const value = await utils.replaceVariables(headerValue, headerName, context);
        if (value === models.HookCancel) {
          return false;
        }
        request.headers[headerName] = value;
      }
    }
  }
  return true;
}
