import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { cookieStore, environmentStore } from '../environments';
import { getHeader, isString } from '../utils';

export class CookieJarAction implements HttpRegionAction {
  type = ActionType.cookieJar;

  async process({ request, httpRegion }: ProcessorContext) : Promise<boolean> {
    if (request
      && !httpRegion.metaData.noCookieJar
      && environmentStore.environmentConfig?.cookieJarEnabled) {
      const jar = cookieStore.jar;
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
