import { HttpFile } from './models';
import { parseHttpFile } from './parser';
import { log } from './logger';

interface HttpFileStoreEntry{
  version: number;
  fileName: string;
  httpFile?: HttpFile;
  promise?: Promise<HttpFile>
}

export class HttpFileStore {
  private readonly storeCache: Array<HttpFileStoreEntry> = [];

  private getFromStore(fileName: string, version: number) {
    let httpFileStoreEntry = this.storeCache.find(obj => obj.fileName === fileName);
    if (!httpFileStoreEntry) {
      httpFileStoreEntry = {
        fileName,
        version,
      };
      this.storeCache.push(httpFileStoreEntry);
    }
    return httpFileStoreEntry;
  }

  get(fileName: string): HttpFile | undefined {
    return this.storeCache.find(obj => obj.fileName === fileName)?.httpFile;
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
  getOrCreate(fileName: string, getText: () => Promise<string>, version: number): Promise<HttpFile> {
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
                const cachedHttpRegion = httpFileStoreEntry.httpFile.httpRegions.find(obj => obj.source === httpRegion.source);
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

  private async createHttpFile(fileName: string, getText: () => Promise<string>) {
    const text = await getText();
    return await parseHttpFile(text, fileName, this);
  }

  async parse(fileName: string, text: string) : Promise<HttpFile> {
    return await parseHttpFile(text, fileName, this);
  }

  remove(fileName: string) : void {
    const index = this.storeCache.findIndex(obj => obj.fileName === fileName);
    if (index >= 0) {
      this.storeCache.splice(index, 1);
    }
  }

  rename(oldFileName: string, newFileName: string) : void {
    const httpFileStoreEntry = this.storeCache.find(obj => obj.fileName === oldFileName);
    if (httpFileStoreEntry) {
      httpFileStoreEntry.fileName = newFileName;
      if (httpFileStoreEntry.httpFile) {
        httpFileStoreEntry.httpFile.fileName = newFileName;
      }
    }
  }

  clear() : void {
    this.storeCache.length = 0;
  }
}
