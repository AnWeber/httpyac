import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { cookieStore } from '../store';
import * as utils from '../utils';
import { CookieJar } from 'tough-cookie';

export class CookieJarAction implements HttpRegionAction {
  id = ActionType.cookieJar;

  async process(context: ProcessorContext): Promise<boolean> {
    const { request, httpRegion, httpFile, config } = context;
    if (utils.isHttpRequest(request) && !httpRegion.metaData.noCookieJar && config?.cookieJarEnabled && cookieStore) {
      utils.report(context, `set cookie jar`);
      const jar = new CookieJar(cookieStore.getCookieStoreEntry(httpFile).memoryCookieStore);
      if (request.headers && request.url) {
        const cookieHeader = utils.getHeader(request.headers, 'cookie');
        if (cookieHeader) {
          if (utils.isString(cookieHeader)) {
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
