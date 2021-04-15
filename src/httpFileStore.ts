import { HttpFile } from './models';
import { parseHttpFile } from './parser';
import { log } from './logger';

interface HttpFileStoreEntry{
  version: number;
  fileName: string;
  httpFile?: HttpFile;
}

export class HttpFileStore{


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

  get(fileName: string) {
    return this.storeCache.find(obj => obj.fileName === fileName)?.httpFile;
  }

  getAll() {
    return this.storeCache.map(obj => obj.httpFile);
  }
  async getOrCreate(fileName: string, getText: () => Promise<string>, version: number): Promise<HttpFile> {
    try {
      const httpFileStoreEntry: HttpFileStoreEntry = this.getFromStore(fileName, version);
      if (version > httpFileStoreEntry.version || !httpFileStoreEntry.httpFile) {
        const httpFile = (await parseHttpFile(await getText(), fileName));
        httpFile.fileName = fileName;
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
      }
      return httpFileStoreEntry.httpFile;
    } catch (err) {
      log.error(fileName);
      throw err;
    }
  }

  remove(fileName: string) {
    const index = this.storeCache.findIndex(obj => obj.fileName === fileName);
    if (index >= 0) {
      this.storeCache.splice(index, 1);
    }
  }

  rename(oldFileName: string, newFileName: string) {
    const httpFile = this.storeCache.find(obj => obj.fileName === oldFileName);
    if (httpFile) {
      httpFile.fileName = newFileName;
    }
  }

  clear() {
    this.storeCache.length = 0;
  }

  toString() {
    return 'httpFileStore';
  }
}

export const httpFileStore = new HttpFileStore();