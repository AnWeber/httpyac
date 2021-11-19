import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { cookieStore } from '../store';
import { getHeader, isHttpRequest, isString } from '../utils';
import { CookieJar } from 'tough-cookie';

export class CookieJarAction implements HttpRegionAction {
  id = ActionType.cookieJar;

  async process({ request, httpRegion, httpFile, config }: ProcessorContext): Promise<boolean> {
    if (isHttpRequest(request) && !httpRegion.metaData.noCookieJar && config?.cookieJarEnabled) {
      const jar = new CookieJar(cookieStore.getCookieStoreEntry(httpFile).memoryCookieStore);
      if (request.headers && request.url) {
        const cookieHeader = getHeader(request.headers, 'cookie');
        if (cookieHeader) {
          if (isString(cookieHeader)) {
            await jar.setCookie(cookieHeader, request.url);
          } else if (Array.isArray(cookieHeader)) {
            for (const val of cookieHeader) {
              await jar.setCookie(val, request.url);
            }
          }
        }
      }
      request.cookieJar = jar;
    }
    return true;
  }
}
