import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { cookieStore } from '../store';
import { getHeader, isString } from '../utils';

export class CookieJarAction implements HttpRegionAction {
  id = ActionType.cookieJar;

  async process({ request, httpRegion, httpFile, config }: ProcessorContext) : Promise<boolean> {
    if (request
      && !httpRegion.metaData.noCookieJar
      && config?.cookieJarEnabled) {
      const jar = cookieStore.getCookieJar(httpFile);
      if (request.headers && request.url) {
        const cookieHeader = getHeader(request.headers, 'cookie');
        if (cookieHeader) {
          if (isString(cookieHeader)) {
            await jar.setCookie(cookieHeader, request.url);
          } else {
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
