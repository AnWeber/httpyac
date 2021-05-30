import { HttpFile } from './models';
import { parseHttpFile } from './parser';
import { log } from './logger';
import { fileProvider, PathLike } from './fileProvider';

interface HttpFileStoreEntry{
  version: number;
  cacheKey: string;
  httpFile?: HttpFile;
  promise?: Promise<HttpFile>
}

export class HttpFileStore {
  private readonly storeCache: Array<HttpFileStoreEntry> = [];

  private getFromStore(fileName: PathLike, version: number) {
    const cacheKey = fileProvider.toString(fileName);
    let httpFileStoreEntry = this.storeCache.find(obj => obj.cacheKey === cacheKey);
    if (!httpFileStoreEntry) {
      httpFileStoreEntry = {
        cacheKey,
        version,
      };
      this.storeCache.push(httpFileStoreEntry);
    }
    return httpFileStoreEntry;
  }

  get(fileName: PathLike): HttpFile | undefined {
    const cacheKey = fileProvider.toString(fileName);
    return this.storeCache.find(obj => obj.cacheKey === cacheKey)?.httpFile;
  }

  getAll(): Array<HttpFile> {
    const result: Array<HttpFile> = [];
    for (const store of this.storeCache) {
      if (store.httpFile) {
        result.push(store.httpFile);
      }
    }
    return result;
  }
  getOrCreate(fileName: PathLike, getText: () => Promise<string>, version: number): Promise<HttpFile> {
    const startTime = Date.now();
    try {
      const httpFileStoreEntry: HttpFileStoreEntry = this.getFromStore(fileName, version);
      if (version > httpFileStoreEntry.version || !httpFileStoreEntry.httpFile) {
        if (httpFileStoreEntry.promise
          && version <= httpFileStoreEntry.version) {
          return httpFileStoreEntry.promise;
        }
        httpFileStoreEntry.promise = this.createHttpFile(fileName, getText)
          .then(httpFile => {
            delete httpFileStoreEntry.promise;
            if (httpFileStoreEntry.httpFile) {
              httpFile.variablesPerEnv = httpFileStoreEntry.httpFile.variablesPerEnv;
              httpFile.activeEnvironment = httpFileStoreEntry.httpFile.activeEnvironment;
              for (const httpRegion of httpFile.httpRegions) {
                const cachedHttpRegion = httpFileStoreEntry.httpFile.httpRegions.find(obj => obj.symbol.source === httpRegion.symbol.source);
                if (cachedHttpRegion) {
                  httpRegion.response = cachedHttpRegion.response;
                }
              }
            }
            httpFileStoreEntry.version = version;
            httpFileStoreEntry.httpFile = httpFile;
            log.trace(`httpFileStore.getOrCreate: ${Math.floor((Date.now() - startTime))}ms`);
            return httpFile;
          });
        return httpFileStoreEntry.promise;
      }
      return httpFileStoreEntry.promise || Promise.resolve(httpFileStoreEntry.httpFile);
    } catch (err) {
      log.error(fileName);
      throw err;
    }
  }

  private async createHttpFile(fileName: PathLike, getText: () => Promise<string>) {
    const text = await getText();
    return await parseHttpFile(text, fileName, this);
  }

  async parse(fileName: PathLike, text: string) : Promise<HttpFile> {
    return await parseHttpFile(text, fileName, this);
  }

  remove(fileName: PathLike): void {
    const cacheKey = fileProvider.toString(fileName);
    const index = this.storeCache.findIndex(obj => obj.cacheKey === cacheKey);
    if (index >= 0) {
      this.storeCache.splice(index, 1);
    }
  }

  rename(oldFileName: PathLike, newFileName: PathLike) : void {
    const oldCacheKey = fileProvider.toString(oldFileName);
    const httpFileStoreEntry = this.storeCache.find(obj => obj.cacheKey === oldCacheKey);
    if (httpFileStoreEntry) {
      httpFileStoreEntry.cacheKey = fileProvider.toString(newFileName);
      if (httpFileStoreEntry.httpFile) {
        httpFileStoreEntry.httpFile.fileName = newFileName;
      }
    }
  }

  clear() : void {
    this.storeCache.length = 0;
  }
}
