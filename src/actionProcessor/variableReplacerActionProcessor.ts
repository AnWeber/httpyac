import { HttpRequest, ProcessorContext, VariableReplacerType} from '../models';
import { replaceVariables } from './variableActionProcessor';
import { isString } from '../utils';
import { log } from '../logger';


export async function variableReplacerActionProcessor(_data: unknown, context: ProcessorContext) : Promise<boolean> {
  if (context.request) {
    let cancel = false;
    context.cancelVariableReplacer = () => cancel = true;

    const replacer = async (value: string, type: VariableReplacerType | string) => {
      if (!cancel) {
        return await replaceVariables(value, type, context);
      }
      log.trace(`variableReplacer canceled with type ${type}: ${value}`);
      return value;
    };

    if (context.request.url) {
      log.trace(`variableReplacer replace url`);
      context.request.url = await replacer(context.request.url, VariableReplacerType.url) || context.request.url;
    }
    await replaceVariablesInBody(context.request, replacer);
    await replaceVariablesInHeader(context.request, replacer);
    return !cancel;
  }
  return true;
}


async function replaceVariablesInBody(replacedReqeust: HttpRequest, replacer: (value: string, type: VariableReplacerType | string) => Promise<string | undefined>) {
  if (replacedReqeust.body) {
    log.trace(`variableReplacer replace body`);
    if (isString(replacedReqeust.body)) {
      replacedReqeust.body = await replacer(replacedReqeust.body, VariableReplacerType.body);
    } else if (Array.isArray(replacedReqeust.body)) {
      const replacedBody: Array<string | (() => Promise<Buffer>)> = [];
      for (const obj of replacedReqeust.body) {
        if (isString(obj)) {
          const value = await replacer(obj, VariableReplacerType.body);
          if (value) {
            replacedBody.push(value);
          }
        } else {
          replacedBody.push(obj);
        }
      }
      replacedReqeust.body = replacedBody;
    }
  }
}

async function replaceVariablesInHeader(replacedReqeust: HttpRequest, replacer: (value: string, type: VariableReplacerType | string) => Promise<string | undefined>) {
  if (replacedReqeust.headers) {
    for (const [headerName, headerValue] of Object.entries(replacedReqeust.headers)) {
      if (isString(headerValue)) {
        log.trace(`variableReplacer replace header ${headerName}`);
        const value = await replacer(headerValue, headerName);
        if (value === undefined) {
          delete replacedReqeust.headers[headerName];
        } else {
          replacedReqeust.headers[headerName] = value;
        }
      }
    }
  }
}