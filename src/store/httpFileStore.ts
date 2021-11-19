import { initOnRequestHook, initOnResponseHook } from '../actions';
import { fileProvider, log, userInteractionProvider } from '../io';
import * as models from '../models';
import { HookCancel } from '../models';
import { initParseEndHook, initParseHook, parseHttpFile } from '../parser';
import { userSessionStore as sessionStore } from '../store';
import * as utils from '../utils';
import { replacer, provider } from '../variables';
import { default as chalk } from 'chalk';
import merge from 'lodash/merge';

interface HttpFileStoreEntry {
  version: number;
  cacheKey: string;
  httpFile?: models.HttpFile;
  promise?: Promise<models.HttpFile>;
}

export type HttpFileStoreOptions = Omit<models.ParseOptions, 'httpFileStore'>;

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

  getOrCreate(
    fileName: models.PathLike,
    getText: () => Promise<string>,
    version: number,
    options: HttpFileStoreOptions
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
                httpRegion.variablesPerEnv = prevHttpRegion.variablesPerEnv;
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

  private async initHttpFile(fileName: models.PathLike, options: HttpFileStoreOptions) {
    const absoluteFileName = (await utils.toAbsoluteFilename(fileName, options.workingDir)) || fileName;

    const rootDir = await utils.findRootDirOfFile(
      absoluteFileName,
      options.workingDir,
      'package.json',
      ...utils.defaultConfigFiles,
      options.config?.envDirName || 'env'
    );

    const httpFile: models.HttpFile = {
      fileName: absoluteFileName,
      rootDir,
      hooks: {
        parse: initParseHook(),
        parseEndRegion: initParseEndHook(),
        replaceVariable: replacer.initReplaceVariableHook(),
        provideEnvironments: provider.initProvideEnvironmentsHook(),
        provideVariables: provider.initProvideVariablesHook(),
        onRequest: initOnRequestHook(),
        onResponse: initOnResponseHook(),
        responseLogging: new models.ResponseLoggingHook(),
      },
      httpRegions: [],
      activeEnvironment: options.activeEnvironment,
    };

    options.config = await getEnviromentConfig(options.config, httpFile.rootDir);

    const hooks: Record<string, models.ConfigureHooks> = {};
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
    options: HttpFileStoreOptions,
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

export async function getEnviromentConfig(
  config?: models.EnvironmentConfig,
  rootDir?: models.PathLike
): Promise<models.EnvironmentConfig> {
  const environmentConfigs: Array<models.EnvironmentConfig> = [];
  if (rootDir) {
    const fileConfig = await utils.getHttpacConfig(rootDir);
    if (fileConfig) {
      environmentConfigs.push(fileConfig);
    }
  }
  if (config) {
    environmentConfigs.push(config);
  }

  const result = merge(
    {
      log: {
        level: models.LogLevel.warn,
        supportAnsiColors: true,
      },
      cookieJarEnabled: true,
      envDirName: 'env',
    },
    ...environmentConfigs
  );

  refreshStaticConfig(result);
  return result;
}

function refreshStaticConfig(config: models.EnvironmentConfig) {
  log.options.level = config?.log?.level ?? models.LogLevel.warn;
  if (config?.log?.supportAnsiColors === false) {
    chalk.level = 0;
  }
}
