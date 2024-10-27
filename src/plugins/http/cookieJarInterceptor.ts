import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import { Cookie, CookieJar, MemoryCookieStore } from 'tough-cookie';

import { log } from '../../io';
import * as models from '../../models';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';

export interface CookieSession extends models.UserSession {
  cookie?: Cookie;
}

export class CookieJarInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'cookieJar';
  async beforeTrigger(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const { request, httpRegion, config, options } = hookContext.args[0];

    if (utils.isHttpRequest(request) && !httpRegion.metaData.noCookieJar && config?.cookieJarEnabled) {
      const idPrefix = this.getCookieStorePrefix(hookContext.args[0]);
      const cookieSessions: Array<CookieSession> = userSessionStore.userSessions.filter(
        obj => obj.type === 'Cookie' && obj.id.startsWith(idPrefix)
      );

      const memoryStore = new MemoryCookieStore();
      for (const cookieSession of cookieSessions) {
        if (cookieSession.cookie) {
          memoryStore.putCookie(cookieSession.cookie, err => {
            if (err) {
              log.info(err);
            }
          });
        }
      }
      options.memoryStore = memoryStore;
      const cookieJarOptions = {};
      if (config.cookieJarEnabled !== true) {
        Object.assign(cookieJarOptions, config.cookieJarEnabled);
      }
      const jar = new CookieJar(memoryStore, cookieJarOptions);
      if (!request.options) {
        request.options = {};
      }
      request.options.cookieJar = jar;
    }
    return true;
  }
  async afterTrigger(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const { options } = hookContext.args[0];

    const memoryStore = options.memoryStore;

    if (memoryStore && memoryStore instanceof MemoryCookieStore) {
      memoryStore.getAllCookies((err, cookies) => {
        if (!err) {
          for (const cookie of cookies || []) {
            const cookieSession: CookieSession = {
              id: `${this.getCookieStorePrefix(hookContext.args[0])}_${cookie.toString()}`,
              title: `${cookie.domain} ${cookie.path} ${cookie.key}`,
              description: `${cookie}`,
              type: 'Cookie',
              details: Object.fromEntries(
                Object.entries(cookie)
                  .map(([key, value]) => {
                    if (value) {
                      if (value instanceof Date) {
                        return [key, value.toISOString()];
                      }
                      return [key, value];
                    }
                    return [];
                  })
                  .filter(obj => obj.length > 0)
              ),
              cookie,
            };
            userSessionStore.setUserSession(cookieSession);
          }
        }
      });

      const cookieSessions: Array<CookieSession> = userSessionStore.userSessions.filter(obj => obj.type === 'Cookie');

      for (const cookieSession of cookieSessions) {
        if (cookieSession.cookie) {
          memoryStore.putCookie(cookieSession.cookie, err => {
            if (err) {
              log.info(err);
            }
          });
        }
      }
    }
    return true;
  }
  private getCookieStorePrefix(context: models.ProcessorContext) {
    return `Cookies_${utils.toEnvironmentKey(context.activeEnvironment)}_${
      context.httpFile.rootDir?.toString?.() || 'none'
    }`;
  }
}
