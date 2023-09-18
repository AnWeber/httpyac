import { CookieJar } from 'tough-cookie';

import { ProcessorContext } from '../../models';
import { isHttpRequest, isString } from '../../utils';

export async function cookieVariableReplacer(text: unknown, type: string, context: ProcessorContext): Promise<unknown> {
  const { request } = context;
  if (
    type.toLowerCase() === 'cookie' &&
    isHttpRequest(request) &&
    request.url &&
    request.options?.cookieJar instanceof CookieJar
  ) {
    if (isString(text)) {
      request.options.cookieJar.setCookie(text, request.url);
    } else if (Array.isArray(text)) {
      for (const val of text) {
        await request.options.cookieJar.setCookie(val, request.url);
      }
    }
    return undefined;
  }
  return text;
}
