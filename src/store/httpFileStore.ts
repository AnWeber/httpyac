import * as models from '../models';
import { initParseEndHook, initParseHook, parseHttpFile } from '../parser';
import { fileProvider, log, userInteractionProvider } from '../io';
import { userSessionStore as sessionStore } from '../store';
import { getEnvironments } from '../httpYacApi';
import { replacer, provider } from '../variables';
import * as utils from '../utils';
import merge from 'lodash/merge';
import { default as chalk } from 'chalk';
import { HookCancel } from '../models';

interface HttpFileStoreEntry{
  version: number;
  cacheKey: string;
  httpFile?: models.HttpFile;
  promise?: Promise<models.HttpFile>
}

export type HttpFileStoreOptions = Omit<models.ParseOptions, 'httpFileStore'>

export class HttpFileStore {
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

  getOrCreate(fileName: models.PathLike, getText: () => Promise<string>, version: number, options: HttpFileStoreOptions): Promise<models.HttpFile> {
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

  private async validateActiveEnvironemnt(httpFile: models.HttpFile, options: HttpFileStoreOptions) {
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


  async parse(fileName: models.PathLike, text: string, options: HttpFileStoreOptions): Promise<models.HttpFile> {
    const httpFile = await this.initHttpFile(fileName, options);
    return await parseHttpFile(httpFile, text, this);
  }

  remove(fileName: models.PathLike): void {
    const cacheKey = fileProvider.toString(fileName);
    const index = this.storeCache.findIndex(obj => obj.cacheKey === cacheKey);
    if (index >= 0) {
      this.storeCache.splice(index, 1);
    }
  }

  rename(oldFileName: models.PathLike, newFileName: models.PathLike) : void {
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

  private async initHttpFile(fileName: models.PathLike, options: HttpFileStoreOptions) {
    const rootDir = await utils.findRootDirOfFile(fileName, options.workingDir,
      ...utils.DefaultRootFiles, options.config?.envDirName || 'env');

    const httpFile: models.HttpFile = {
      fileName,
      rootDir,
      hooks: {
        parse: initParseHook(),
        parseEndRegion: initParseEndHook(),
        replaceVariable: replacer.initReplaceVariableHook(),
        provideEnvironments: provider.initProvideEnvironmentsHook(),
        provideVariables: provider.initProvideVariablesHook(),
        beforeRequest: new models.BeforeRequestHook(),
        afterRequest: new models.AfterRequestHook(),
        responseLogging: new models.ResponseLoggingHook(),
      },
      httpRegions: [],
      variablesPerEnv: {},
      activeEnvironment: options.activeEnvironment
    };

    httpFile.config = await getEnviromentConfig({
      httpFile,
      config: options.config,
    });

    if (rootDir) {
      const hooks = await utils.getPlugins(rootDir);
      if (httpFile.config?.configureHooks) {
        hooks['.httpyac.js'] = httpFile.config.configureHooks;
      }
      const api: models.HttpyacHooksApi = {
        version: '1.0.0',
        rootDir,
        config: httpFile.config,
        httpFile,
        hooks: httpFile.hooks,
        log,
        fileProvider,
        sessionStore,
        userInteractionProvider,
        getHookCancel: () => HookCancel,
      };
      for (const [plugin, hook] of Object.entries(hooks)) {
        try {
          log.debug(`load ${plugin}`);
          const result = hook(api);
          if (utils.isPromise(result)) {
            await result;
          }
        } catch (err) {
          log.error(`error in ${plugin}`, err);
        }
      }
    }
    return httpFile;
  }
}


export async function getEnviromentConfig(context: models.VariableProviderContext) : Promise<models.EnvironmentConfig> {
  const environmentConfigs : Array<models.EnvironmentConfig> = [];
  if (context.httpFile.rootDir) {
    const fileConfig = await utils.getHttpacConfig(context.httpFile.rootDir);
    if (fileConfig) {
      environmentConfigs.push(fileConfig);
    }
  }
  if (context.config) {
    environmentConfigs.push(context.config);
  }

  const config = merge({
    log: {
      level: models.LogLevel.warn,
      supportAnsiColors: true,
    },
    cookieJarEnabled: true,
    envDirName: 'env',
  }, ...environmentConfigs);

  refreshStaticConfig(config);
  showDeprectationWarning(config);
  return config;
}

function refreshStaticConfig(config: models.EnvironmentConfig) {
  log.options.level = config?.log?.level ?? models.LogLevel.warn;
  if (config?.log?.supportAnsiColors === false) {
    chalk.level = 0;
  }
}


function showDeprectationWarning(config: models.EnvironmentConfig) {
  const deprecated = config as {
    dotenv: unknown;
    intellij: unknown;
    httpRegionScript: unknown;
  };

  if (deprecated.dotenv) {
    log.warn('setting dotenv is deprecated. Please use envDirName instead, if needed');
  }
  if (deprecated.intellij) {
    log.warn('setting intellij is deprecated. Please use envDirName instead, if needed');
  }
  if (deprecated.httpRegionScript) {
    log.warn('setting httpRegionScript is deprecated. Please use hooks.beforeRequest instead.');
  }

}
