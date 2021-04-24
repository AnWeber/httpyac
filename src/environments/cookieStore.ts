import { Cookie, CookieJar, MemoryCookieStore } from 'tough-cookie';
import { log } from '../logger';


class CookieStore {
  private memoryCookieStore = new MemoryCookieStore();

  get cookies() {
    const result: Cookie[] = [];

    if (this.memoryCookieStore.synchronous) {
      this.memoryCookieStore.getAllCookies((err, cookies: Array<Cookie>) => {
        if (!err) {
          result.push(...cookies);
        }
      });
    }
    return result;
  }

  get jar() {
    return new CookieJar(this.memoryCookieStore);
  }

  async reset() {
    this.memoryCookieStore = new MemoryCookieStore();
  }

  removeCookies(cookies: Cookie[]) {
    for (const cookie of cookies) {
      if (cookie.domain && cookie.path) {
        this.memoryCookieStore.removeCookie(cookie.domain, cookie.path, cookie.key, err => {
          if (err) {
            log.error(err);
          }
        });
      }
    }

  }
}

export const cookieStore = new CookieStore();
