import { HttpFile, ParseOptions } from '../models';
import { parseHttpFile } from '../parser';
import { fileProvider, PathLike } from '../io';
import { getEnvironments } from '../httpYacApi';

interface HttpFileStoreEntry{
  version: number;
  cacheKey: string;
  httpFile?: HttpFile;
  promise?: Promise<HttpFile>
}

export type HttpFileStoreOptions = Omit<ParseOptions, 'httpFileStore'>

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

  getOrCreate(fileName: PathLike, getText: () => Promise<string>, version: number, options: HttpFileStoreOptions): Promise<HttpFile> {
    const httpFileStoreEntry: HttpFileStoreEntry = this.getFromStore(fileName, version);
    if (version > httpFileStoreEntry.version || !httpFileStoreEntry.httpFile) {
      if (httpFileStoreEntry.promise
        && version <= httpFileStoreEntry.version) {
        return httpFileStoreEntry.promise;
      }

      httpFileStoreEntry.promise = getText()
        .then(text => this.parse(fileName, text, options))
        .then(httpFile => this.validateActiveEnvironemnt(httpFile, options))
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
          return httpFile;
        });
      return httpFileStoreEntry.promise;
    }
    return httpFileStoreEntry.promise || Promise.resolve(httpFileStoreEntry.httpFile);
  }

  private async validateActiveEnvironemnt(httpFile: HttpFile, options: HttpFileStoreOptions) {
    if (httpFile.activeEnvironment) {
      const environments = await getEnvironments({
        httpFile,
        config: options.config,
      });
      httpFile.activeEnvironment = httpFile.activeEnvironment.filter(env => environments.indexOf(env) >= 0);
      if (httpFile.activeEnvironment.length === 0) {
        httpFile.activeEnvironment = undefined;
      }
    }
    return httpFile;
  }


  async parse(fileName: PathLike, text: string, options: HttpFileStoreOptions) : Promise<HttpFile> {
    return await parseHttpFile(fileName, text, Object.assign({
      httpFileStore: this,
    }, {
      httpFileStore: this,
      ...options
    }));
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
