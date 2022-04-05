import { fileProvider, log, userInteractionProvider } from '../io';
import * as models from '../models';
import { userSessionStore as sessionStore } from '../store';
import * as utils from '../utils';
import { pluginStore } from './pluginStore';
import { default as chalk } from 'chalk';
import { HookCancel } from 'hookpoint';
import merge from 'lodash/merge';

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

  async parse(fileName: models.PathLike, text: string, options: models.HttpFileStoreOptions): Promise<models.HttpFile> {
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

  async initHttpFile(fileName: models.PathLike, options: models.HttpFileStoreOptions) {
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
        parse: new models.ParseHook(),
        parseMetaData: new models.ParseMetaDataHook(),
        parseEndRegion: new models.ParseEndRegionHook(),
        replaceVariable: new models.ReplaceVariableHook(),
        provideEnvironments: new models.ProvideEnvironmentsHook(),
        provideVariables: new models.ProvideVariablesHook(),
        execute: new models.ExecuteHook(),
        onStreaming: new models.OnStreaming(),
        onRequest: new models.OnRequestHook(),
        onResponse: new models.OnResponseHook(),
        responseLogging: new models.ResponseLoggingHook(),
      },
      httpRegions: [],
      activeEnvironment: options.activeEnvironment,
    };

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

export async function getEnvironmentConfig(
  config?: models.EnvironmentConfig,
  rootDir?: models.PathLike
): Promise<models.EnvironmentConfig> {
  const environmentConfigs: Array<models.EnvironmentConfig> = [];
  if (rootDir) {
    const fileConfig = await utils.getHttpyacConfig(rootDir);
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
  if (typeof config?.log?.level === 'undefined') {
    log.options.level = models.LogLevel.warn;
  } else {
    log.options.level = config?.log?.level;
  }
  if (config?.log?.supportAnsiColors === false) {
    chalk.level = 0;
  }
}

async function parseHttpFile(
  httpFile: models.HttpFile,
  text: string,
  httpFileStore: models.HttpFileStore
): Promise<models.HttpFile> {
  const lines = utils.toMultiLineArray(text);

  const parserContext: models.ParserContext = {
    lines,
    httpFile,
    httpRegion: initHttpRegion(0),
    data: {},
    httpFileStore,
  };

  for (let line = 0; line < lines.length; line++) {
    const httpRegionParserResult = await httpFile.hooks.parse.trigger(createReaderFactory(line, lines), parserContext);
    if (httpRegionParserResult && httpRegionParserResult !== HookCancel) {
      if (httpRegionParserResult.endRegionLine !== undefined && httpRegionParserResult.endRegionLine >= 0) {
        parserContext.httpRegion.symbol.endLine = httpRegionParserResult.endRegionLine;
        parserContext.httpRegion.symbol.endOffset = lines[httpRegionParserResult.endRegionLine].length;
        await closeHttpRegion(parserContext);
        parserContext.httpRegion = initHttpRegion(httpRegionParserResult.nextParserLine + 1);
      }
      if (httpRegionParserResult.symbols) {
        if (parserContext.httpRegion.symbol.children) {
          parserContext.httpRegion.symbol.children.push(...httpRegionParserResult.symbols);
        } else {
          parserContext.httpRegion.symbol.children = httpRegionParserResult.symbols;
        }
      }
      line = httpRegionParserResult.nextParserLine;
    }
  }

  await closeHttpRegion(parserContext);
  parserContext.httpRegion.symbol.endLine = lines.length - 1;
  parserContext.httpRegion.symbol.endOffset = lines[lines.length - 1].length;
  setSource(httpFile.httpRegions, lines);
  return httpFile;
}

async function closeHttpRegion(parserContext: models.ParserContext): Promise<void> {
  await parserContext.httpFile.hooks.parseEndRegion.trigger(parserContext);

  const { httpRegion } = parserContext;
  parserContext.httpRegion.symbol.name = utils.getDisplayName(httpRegion);
  parserContext.httpRegion.symbol.description = utils.getRegionDescription(httpRegion);
  parserContext.httpFile.httpRegions.push(parserContext.httpRegion);
}

function setSource(httpRegions: Array<models.HttpRegion>, lines: Array<string>) {
  for (const httpRegion of httpRegions) {
    setSymbolSource(httpRegion.symbol, lines);
  }
}

function setSymbolSource(symbol: models.HttpSymbol, lines: Array<string>): void {
  symbol.source = utils.toMultiLineString(lines.slice(symbol.startLine, symbol.endLine + 1));
  let endOffset: number | undefined = symbol.endOffset - lines[symbol.endLine].length;
  if (endOffset >= 0) {
    endOffset = undefined;
  }
  symbol.source = symbol.source.slice(symbol.startOffset, endOffset);
  if (symbol.children) {
    for (const child of symbol.children) {
      setSymbolSource(child, lines);
    }
  }
}

function initHttpRegion(start: number): models.HttpRegion {
  return {
    metaData: {},
    symbol: {
      name: '-',
      description: '-',
      kind: models.HttpSymbolKind.request,
      startLine: start,
      startOffset: 0,
      endLine: start,
      endOffset: 0,
    },
    hooks: {
      execute: new models.ExecuteHook(),
      onRequest: new models.OnRequestHook(),
      onStreaming: new models.OnStreaming(),
      onResponse: new models.OnResponseHook(),
      responseLogging: new models.ResponseLoggingHook(),
    },
    variablesPerEnv: {},
    dependentsPerEnv: {},
  };
}

function createReaderFactory(startLine: number, lines: Array<string>) {
  return function* createReader(noStopOnMetaTag?: boolean) {
    for (let line = startLine; line < lines.length; line++) {
      const textLine = lines[line];
      yield {
        textLine,
        line,
      };
      if (!noStopOnMetaTag) {
        // if parser region is not closed stop at delimiter
        if (utils.RegionSeparator.test(textLine)) {
          break;
        }
      }
    }
  };
}
