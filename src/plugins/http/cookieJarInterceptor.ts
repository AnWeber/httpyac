import { log } from '../../io';
import * as models from '../../models';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import { Cookie, CookieJar, MemoryCookieStore } from 'tough-cookie';

export interface CookieSession extends models.UserSession {
  cookie?: Cookie;
}

export class CookieJarInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'cookieJar';
  async beforeTrigger(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const { request, httpFile, httpRegion, config, options } = hookContext.args[0];

    if (utils.isHttpRequest(request) && !httpRegion.metaData.noCookieJar && config?.cookieJarEnabled) {
      const idPrefix = this.getCookieStorePrefix(httpFile);
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
      request.options.cookieJar = jar;
    }
    return true;
  }
  async afterTrigger(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const { httpFile, options } = hookContext.args[0];

    const memoryStore = options.memoryStore;

    if (memoryStore && memoryStore instanceof MemoryCookieStore) {
      memoryStore.getAllCookies((err, cookies) => {
        if (!err) {
          for (const cookie of cookies) {
            const cookieSession: CookieSession = {
              id: `${this.getCookieStorePrefix(httpFile)}_${cookie.toString()}`,
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
  private getCookieStorePrefix(httpFile: models.HttpFile) {
    return `Cookies_${utils.toEnvironmentKey(httpFile.activeEnvironment)}_${httpFile.rootDir?.toString?.() || 'none'}`;
  }
}
