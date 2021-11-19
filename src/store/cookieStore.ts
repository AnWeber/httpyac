import { log } from '../io';
import * as models from '../models';
import { toEnvironmentKey } from '../utils';
import { Cookie, MemoryCookieStore } from 'tough-cookie';

interface CookieStoreEntry {
  id: string;
  memoryCookieStore: MemoryCookieStore;
}

class CookieStore {
  private storeCache: Array<CookieStoreEntry> = [];

  private getCookieStoreId(httpFile: models.HttpFile) {
    return `Cookies_${toEnvironmentKey(httpFile.activeEnvironment)}_${httpFile.rootDir?.toString?.() || 'none'}`;
  }

  getCookieStoreEntry(httpFile: models.HttpFile): CookieStoreEntry {
    const id = this.getCookieStoreId(httpFile);
    let result = this.storeCache.find(obj => obj.id === id);
    if (!result) {
      result = {
        id,
        memoryCookieStore: new MemoryCookieStore(),
      };
      this.storeCache.push(result);
    }
    return result;
  }

  getCookies(httpFile: models.HttpFile) {
    const result: Cookie[] = [];

    const { memoryCookieStore } = this.getCookieStoreEntry(httpFile);
    if (memoryCookieStore.synchronous) {
      memoryCookieStore.getAllCookies((err, cookies: Array<Cookie>) => {
        if (!err) {
          result.push(...cookies);
        }
      });
    }
    return result;
  }

  async reset(httpFile?: models.HttpFile) {
    if (httpFile) {
      const cacheObj = this.getCookieStoreEntry(httpFile);
      cacheObj.memoryCookieStore = new MemoryCookieStore();
    } else {
      this.storeCache = [];
    }
  }

  removeCookies(httpFile: models.HttpFile, cookies: Cookie[]) {
    const { memoryCookieStore } = this.getCookieStoreEntry(httpFile);
    for (const cookie of cookies) {
      if (cookie.domain && cookie.path) {
        memoryCookieStore.removeCookie(cookie.domain, cookie.path, cookie.key, err => {
          if (err) {
            log.error(err);
          }
        });
      }
    }
  }
}

export const cookieStore = new CookieStore();
