import { HttpRequest, ProcessorContext, VariableReplacerType} from '../models';
import { httpYacApi } from '../httpYacApi';
import { isString } from '../utils';


export async function variableReplacerActionProcessor(data: unknown, context: ProcessorContext) {
  if (context.request) {
    let cancel = false;
    context.cancelVariableReplacer = () => cancel = true;

    const replacer = async (value: string, type: VariableReplacerType | string) => {
      if (!cancel) {
        return await httpYacApi.replaceVariables(value, type, context);
      }
      return value;
    };

    context.request.url = await replacer(context.request.url, VariableReplacerType.url) || context.request.url;
    await replaceVariablesInHeader(context.request, replacer);
    await replaceVariablesInBody(context.request, replacer);
    return !cancel;
  }
  return true;
}


async function replaceVariablesInBody(replacedReqeust: HttpRequest<any>, replacer: (value: string, type: VariableReplacerType | string) => Promise<string | undefined>) {
  if (replacedReqeust.body) {
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

async function replaceVariablesInHeader(replacedReqeust: HttpRequest<any>, replacer: (value: string, type: VariableReplacerType | string) => Promise<string | undefined>) {
  for (const [headerName, headerValue] of Object.entries(replacedReqeust.headers)) {
    if (isString(headerValue)) {
      const value = await replacer(headerValue, headerName);
      if (value === undefined) {
        delete replacedReqeust.headers[headerName];
      } else {
        replacedReqeust.headers[headerName] = value;
      }
    }
  }
}