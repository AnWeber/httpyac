import { fileProvider, log, userInteractionProvider } from '../io';
import * as models from '../models';
import { userSessionStore as sessionStore } from '../store';
import * as utils from '../utils';
import { getEnvironmentConfig } from './getEnvironmentConfig';
import { HttpFile } from './httpFile';
import { parseHttpFile } from './parser';
import { pluginStore } from './pluginStore';
import { HookCancel } from 'hookpoint';

interface HttpFileStoreEntry {
  version: number;
  cacheKey: string;
  httpFile?: models.HttpFile;
  promise?: Promise<models.HttpFile>;
}

export class HttpFileStore implements models.HttpFileStore {
  private readonly storeCache: Array<HttpFileStoreEntry> = [];

  private getFromStore(fileName: models.PathLike, version: number) {
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

  get(fileName: models.PathLike): models.HttpFile | undefined {
    const cacheKey = fileProvider.toString(fileName);
    return this.storeCache.find(obj => obj.cacheKey === cacheKey)?.httpFile;
  }

  getAll(): Array<models.HttpFile> {
    const result: Array<models.HttpFile> = [];
    for (const store of this.storeCache) {
      if (store.httpFile) {
        result.push(store.httpFile);
      }
    }
    return result;
  }

  getOrCreate(
    fileName: models.PathLike,
    getText: () => Promise<string>,
    version: number,
    options: models.HttpFileStoreOptions
  ): Promise<models.HttpFile> {
    const httpFileStoreEntry: HttpFileStoreEntry = this.getFromStore(fileName, version);
    if (version > httpFileStoreEntry.version || !httpFileStoreEntry.httpFile) {
      if (httpFileStoreEntry.promise && version <= httpFileStoreEntry.version) {
        return httpFileStoreEntry.promise;
      }

      httpFileStoreEntry.promise = getText()
        .then(text => this.parse(fileName, text, options))
        .then(httpFile => {
          delete httpFileStoreEntry.promise;
          if (httpFileStoreEntry.httpFile) {
            for (const httpRegion of httpFile.httpRegions) {
              const prevHttpRegion = httpFileStoreEntry.httpFile.httpRegions.find(
                obj => obj.symbol.source === httpRegion.symbol.source
              );
              if (prevHttpRegion) {
                Object.assign(httpRegion.variablesPerEnv, prevHttpRegion.variablesPerEnv);
              }
            }
            httpFile.activeEnvironment = httpFileStoreEntry.httpFile.activeEnvironment;
          }
          httpFileStoreEntry.version = version;
          httpFileStoreEntry.httpFile = httpFile;
          return httpFile;
        })
        .catch(err => {
          delete httpFileStoreEntry.promise;
          if (httpFileStoreEntry.httpFile) {
            this.remove(httpFileStoreEntry.httpFile.fileName);
          }
          throw err;
        });
      return httpFileStoreEntry.promise;
    }
    return httpFileStoreEntry.promise || Promise.resolve(httpFileStoreEntry.httpFile);
  }

  async parse(fileName: models.PathLike, text: string, options: models.HttpFileStoreOptions): Promise<models.HttpFile> {
    const httpFile = await this.initHttpFile(fileName, options);
    return await parseHttpFile(httpFile, text, this);
  }

  remove(fileName: models.PathLike): boolean {
    const cacheKey = fileProvider.toString(fileName);
    const index = this.storeCache.findIndex(obj => obj.cacheKey === cacheKey);
    if (index >= 0) {
      this.storeCache.splice(index, 1);
      return true;
    }
    return false;
  }

  rename(oldFileName: models.PathLike, newFileName: models.PathLike): void {
    const oldCacheKey = fileProvider.toString(oldFileName);
    const httpFileStoreEntry = this.storeCache.find(obj => obj.cacheKey === oldCacheKey);
    if (httpFileStoreEntry) {
      httpFileStoreEntry.cacheKey = fileProvider.toString(newFileName);
      if (httpFileStoreEntry.httpFile) {
        httpFileStoreEntry.httpFile.fileName = newFileName;
      }
    }
  }

  clear(): void {
    this.storeCache.length = 0;
  }

  async initHttpFile(fileName: models.PathLike, options: models.HttpFileStoreOptions) {
    const absoluteFileName = (await utils.toAbsoluteFilename(fileName, options.workingDir)) || fileName;

    const rootDir = await utils.findRootDirOfFile(
      absoluteFileName,
      options.workingDir,
      'package.json',
      ...utils.defaultConfigFiles,
      options.config?.envDirName || 'env'
    );

    const httpFile = new HttpFile(absoluteFileName, rootDir);

    options.config = await getEnvironmentConfig(options.config, httpFile.rootDir);

    const hooks: Record<string, models.ConfigureHooks> = { ...pluginStore };
    if (rootDir) {
      Object.assign(hooks, await utils.getPlugins(rootDir));
      if (options.config?.configureHooks) {
        hooks['.httpyac.js'] = options.config.configureHooks;
      }
    }
    const envPluginLocation = process.env.HTTPYAC_PLUGIN;
    if (envPluginLocation) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const envHook = require(envPluginLocation);
        if (envHook.configureHooks) {
          hooks.HTTPYAC_PLUGIN = envHook.configureHooks;
        }
      } catch (err) {
        log.warn('Global Hook Plugin not loaded', err);
      }
    }
    await this.configureHooks(httpFile, options, hooks);
    return httpFile;
  }

  private async configureHooks(
    httpFile: models.HttpFile,
    options: models.HttpFileStoreOptions,
    hooks: Record<string, models.ConfigureHooks>
  ) {
    if (options.config) {
      const api: models.HttpyacHooksApi = {
        version: '1.0.0',
        rootDir: httpFile.rootDir,
        config: options.config,
        httpFile,
        hooks: httpFile.hooks,
        log,
        fileProvider,
        sessionStore,
        userInteractionProvider,
        utils,
        getHookCancel: () => HookCancel,
      };
      for (const [plugin, hook] of Object.entries(hooks)) {
        try {
          log.trace(`load ${plugin}`);
          const result = hook(api);
          if (utils.isPromise(result)) {
            await result;
          }
        } catch (err) {
          log.error(`error in ${plugin}`, err);
        }
      }
    }
  }
}
