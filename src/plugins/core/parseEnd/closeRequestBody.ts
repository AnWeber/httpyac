import * as models from '../../../models';
import * as utils from '../../../utils';
import { CreateRequestBodyInterceptor } from './createRequestBodyInterceptor';

export async function closeRequestBody(context: models.ParserContext): Promise<void> {
  const requestBody = getAndRemoveRequestBody(context);
  if (context.httpRegion.request && !!requestBody) {
    removeTrailingEmptyLines(requestBody.rawBody);
    context.httpRegion.hooks.execute.addInterceptor(new CreateRequestBodyInterceptor(requestBody.rawBody));
  }
}

function getAndRemoveRequestBody(context: models.ParserContext) {
  const result = context.data.request_body;
  if (result) {
    delete context.data.request_body;
  }
  return result;
}

function removeTrailingEmptyLines(obj: Array<unknown>): void {
  while (obj.length > 0 && utils.isStringEmpty(obj[obj.length - 1])) {
    obj.pop();
  }
  if (obj.length > 0) {
    const lastLine = obj[obj.length - 1];
    if (utils.isString(lastLine)) {
      if (/\s*<--->\s*/u.test(lastLine)) {
        obj.pop();
      }
    }
  }
}
