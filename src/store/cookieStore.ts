import { Cookie, CookieJar, MemoryCookieStore } from 'tough-cookie';
import { log, PathLike } from '../io';
import { HttpFile } from '../models';
import { toEnvironmentKey } from '../utils';


interface CookieStoreEntry{
  rootDir?: PathLike;
  envKey: string;
  memoryCookieStore: MemoryCookieStore;
}

class CookieStore {
  private storeCache: Array<CookieStoreEntry> = [];

  getCookieStoreEntry(httpFile: HttpFile) {
    const envKey = toEnvironmentKey(httpFile.activeEnvironment);
    let result = this.storeCache.find(obj => obj.rootDir === httpFile.rootDir && obj.envKey === envKey);
    if (!result) {
      result = {
        rootDir: httpFile.rootDir,
        envKey,
        memoryCookieStore: new MemoryCookieStore(),
      };
      this.storeCache.push(result);
    }
    return result;
  }

  getCookies(httpFile: HttpFile) {
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

  getCookieJar(httpFile: HttpFile) {
    const { memoryCookieStore } = this.getCookieStoreEntry(httpFile);
    return new CookieJar(memoryCookieStore);
  }

  async reset(httpFile?: HttpFile) {
    if (httpFile) {
      const cacheObj = this.getCookieStoreEntry(httpFile);
      cacheObj.memoryCookieStore = new MemoryCookieStore();
    } else {
      this.storeCache = [];
    }
  }

  removeCookies(httpFile: HttpFile, cookies: Cookie[]) {
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
