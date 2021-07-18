import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as models from '../models';
import { HttpFileStore } from '../httpFileStore';
import { httpYacApi } from '../httpYacApi';
import * as utils from '../utils';
import { environmentStore } from '../environments';
import { SettingsScriptHttpRegionParser } from '../parser';
import { default as globby } from 'globby';
import { PathLike, fileProvider, Logger } from '../io';
import { CliOptions, parseCliOptions, renderHelp, getLogLevel, CliFilterOptions } from './cliOptions';
import { CliContext } from './cliContext';
import { toCliJsonOutput } from './cliJsonOutput';
import { chalkInstance } from '../utils';


export async function send(rawArgs: string[]): Promise<void> {
  const cliOptions = parseCliOptions(rawArgs);
  if (!cliOptions) {
    return;
  }
  if (cliOptions.version) {
    const packageJson = await utils.parseJson<Record<string, string>>(join(__dirname, '../package.json'));
    console.info(`httpyac v${packageJson?.version}`);
    return;
  }
  if (cliOptions.help) {
    renderHelp();
    return;
  }
  await initEnviroment(cliOptions);

  try {
    const httpFiles: models.HttpFile[] = await getHttpFiles(cliOptions.fileName, !!cliOptions.editor);

    if (httpFiles.length > 0) {
      let isFirstRequest = true;
      const jsonOutput: Record<string, Array<models.HttpRegion>> = {};
      while (cliOptions.interactive || isFirstRequest) {
        const selection = await selectAction(httpFiles, cliOptions);

        const processedHttpRegions: Array<models.HttpRegion> = [];

        const context = convertCliOptionsToContext(cliOptions);
        if (selection) {
          await httpYacApi.send(Object.assign({ processedHttpRegions }, context, selection));
          jsonOutput[fileProvider.toString(selection.httpFile.fileName)] = [...processedHttpRegions];
        } else {
          for (const httpFile of httpFiles) {
            await httpYacApi.send(Object.assign({ processedHttpRegions }, context, { httpFile }));
            jsonOutput[fileProvider.toString(httpFile.fileName)] = [...processedHttpRegions];
            processedHttpRegions.length = 0;
          }
        }
        isFirstRequest = false;

        if (cliOptions.json
          || Object.keys(jsonOutput).length > 1
          || Object.entries(jsonOutput).some(([, httpRegions]) => httpRegions.length > 1)) {
          const cliJsonOutput = toCliJsonOutput(jsonOutput, cliOptions);
          if (cliOptions.json) {
            console.info(JSON.stringify(cliJsonOutput, null, 2));
          } else if (context.scriptConsole) {
            const chalk = chalkInstance();
            context.scriptConsole.info(chalk`{bold ${cliJsonOutput.summary.totalRequests}} requests tested ({green ${cliJsonOutput.summary.successRequests} succeeded}, {red ${cliJsonOutput.summary.failedRequests} failed})`);
          }
        }
      }
    } else {
      renderHelp();
      return;
    }
  } catch (err) {
    console.error(err);
    throw err;
  } finally {

    // needed because of async
    // eslint-disable-next-line node/no-process-exit
    process.exit();
  }
}

function convertCliOptionsToContext(cliOptions: CliOptions): CliContext {
  const context : CliContext = {
    repeat: cliOptions.repeat,
    scriptConsole: new Logger({
      level: getLogLevel(cliOptions),
      onlyFailedTests: cliOptions.filter === CliFilterOptions.onlyFailed
    }),
    logResponse: cliOptions.json ? undefined : getRequestLogger(cliOptions),
  };

  return context;
}

async function getHttpFiles(fileName: string | undefined, useEditor: boolean) {
  const httpFiles: models.HttpFile[] = [];
  const httpFileStore = new HttpFileStore();

  if (useEditor) {
    const answer = await inquirer.prompt([{
      type: 'editor',
      message: 'input http request',
      name: 'httpFile'
    }]);
    const file = await httpFileStore.getOrCreate(process.cwd(), async () => answer.httpFile, 0);
    httpFiles.push(file);
  } else if (fileName) {
    const paths = await globby(fileName, {
      expandDirectories: {
        files: ['*.rest', '*.http'],
        extensions: ['http', 'rest']
      }
    });

    for (const path of paths) {
      const httpFile = await httpFileStore.getOrCreate(path, async () => await fs.readFile(path, 'utf8'), 0);
      httpFiles.push(httpFile);
    }
  }
  return httpFiles;
}


type SelectActionResult = { httpRegion?: models.HttpRegion | undefined, httpFile: models.HttpFile } | false;

async function selectAction(httpFiles: models.HttpFile[], cliOptions: CliOptions): Promise<SelectActionResult> {
  if (httpFiles.length === 1) {
    const httpFile = httpFiles[0];
    const httpRegion = getHttpRegion(httpFile, cliOptions);
    if (httpRegion) {
      return {
        httpFile,
        httpRegion
      };
    }
  }

  if (!cliOptions.allRegions) {
    const httpRegionMap: Record<string, { httpRegion?: models.HttpRegion | undefined, httpFile: models.HttpFile }> = {};
    const hasManyFiles = httpFiles.length > 0;
    for (const httpFile of httpFiles) {
      httpRegionMap[hasManyFiles ? `${httpFile.fileName}: all` : 'all'] = { httpFile };

      for (const httpRegion of httpFile.httpRegions) {
        if (httpRegion.request) {
          const line = httpRegion.symbol.children?.find(obj => obj.kind === models.HttpSymbolKind.requestLine)?.startLine || httpRegion.symbol.startLine;
          const name = httpRegion.metaData.name || `${httpRegion.request.method} ${httpRegion.request.url} (line ${line + 1})`;
          httpRegionMap[hasManyFiles ? `${httpFile.fileName}: ${name}` : name] = {
            httpRegion,
            httpFile
          };
        }
      }
    }
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'region',
      message: 'please choose which region to use',
      choices: Object.entries(httpRegionMap).map(([key]) => key),
    }]);
    if (answer.region && httpRegionMap[answer.region]) {
      return httpRegionMap[answer.region];
    }
  }
  return false;
}

function getHttpRegion(httpFile: models.HttpFile, cliOptions: CliOptions): models.HttpRegion | false {
  let httpRegion: models.HttpRegion | false = false;
  if (cliOptions.httpRegionName) {
    httpRegion = httpFile.httpRegions.find(obj => obj.metaData.name === cliOptions.httpRegionName) || false;
  } else {
    httpRegion = httpFile.httpRegions
      .find(obj => cliOptions.httpRegionLine
        && obj.symbol.startLine <= cliOptions.httpRegionLine
        && obj.symbol.endLine >= cliOptions.httpRegionLine) || false;
  }
  return httpRegion;
}

async function initEnviroment(cliOptions: CliOptions): Promise<void> {
  const environmentConfig: models.EnvironmentConfig & models.SettingsConfig = {
    log: {
      level: getLogLevel(cliOptions),
    },
    request: {
      timeout: cliOptions.requestTimeout,
      https: {
        rejectUnauthorized: cliOptions.rejectUnauthorized
      }
    }
  };

  const rootDir = cliOptions.rootDir || await utils.findPackageJson(process.cwd()) || process.cwd();
  await environmentStore.configure([rootDir], environmentConfig);
  initHttpYacApiExtensions(environmentConfig, rootDir);
  environmentStore.activeEnvironments = cliOptions.activeEnvironments;


  if (process.platform === 'win32') {

    // https://github.com/nodejs/node-v0.x-archive/issues/7940
    models.testSymbols.ok = '[x]';
    models.testSymbols.error = '[-]';
  }
}

function initHttpYacApiExtensions(config: models.EnvironmentConfig & models.SettingsConfig, rootDir: PathLike | undefined) {
  if (rootDir && config.httpRegionScript) {
    httpYacApi.httpRegionParsers.push(new SettingsScriptHttpRegionParser(async () => {
      let fileName: PathLike | undefined = config.httpRegionScript;
      if (typeof fileName === 'string') {
        if (!fileProvider.isAbsolute(fileName)) {
          fileName = fileProvider.joinPath(rootDir, fileName);
        }
        try {
          const script = await fileProvider.readFile(fileName, 'utf-8');
          return { script, lineOffset: 0 };
        } catch (err) {
          console.trace(`file not found: ${fileName}`);
        }
      }
      return undefined;
    }));
  }
}


function getRequestLogger(options: CliOptions): models.RequestLogger | undefined {
  const requestLoggerOptions = getOptions(options.output, options.filter === CliFilterOptions.onlyFailed);
  if (requestLoggerOptions) {
    return utils.requestLoggerFactory(
      console.info,
      requestLoggerOptions,
      options.outputFailed ? getOptions(options.outputFailed, options.filter === CliFilterOptions.onlyFailed) : undefined
    );
  }
  return undefined;
}
function getOptions(output: string | undefined, onlyFailed: boolean) : utils.RequestLoggerFactoryOptions | undefined {
  switch (output) {
    case 'body':
      return {
        responseBodyLength: 0,
        onlyFailed
      };
    case 'headers':
      return {
        requestOutput: true,
        requestHeaders: true,
        responseHeaders: true,
        onlyFailed
      };
    case 'response':
      return {
        responseHeaders: true,
        responseBodyLength: 0,
        onlyFailed
      };
    case 'none':
      return undefined;
    case 'short':
      return { useShort: true, onlyFailed };
    case 'exchange':
    default:
      return {
        requestOutput: true,
        requestHeaders: true,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: 0,
        onlyFailed
      };
  }
}
