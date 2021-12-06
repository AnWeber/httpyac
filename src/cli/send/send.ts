import { send } from '../../httpYacApi';
import { fileProvider, Logger } from '../../io';
import * as models from '../../models';
import { HttpFileStore, HttpFileStoreOptions } from '../../store';
import * as utils from '../../utils';
import { toSendJsonOutput } from './jsonOutput';
import { SendOptions, getLogLevel, SendFilterOptions } from './options';
import { default as chalk } from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'fs';
import { default as globby } from 'globby';
import inquirer from 'inquirer';

export function sendCommand() {
  const program = new Command('send')
    .description('send/ execute http files')
    .argument('<fileName>', 'path to file or glob pattern')
    .option('-a, --all', 'execute all http requests in a http file')
    .option('-e, --env  <env...>', 'list of environments')
    .option('--filter <filter>', ' filter requests output (only-failed)')
    .option('--insecure', 'allow insecure server connections when using ssl')
    .option('-i --interactive', 'do not exit the program after request, go back to selection')
    .option('--json', 'use json output')
    .option('-l, --line <line>', 'line of the http requests')
    .option('-n, --name <name>', 'name of the http requests')
    .option('--no-color', 'disable color support')
    .option('-o, --output <output>', 'output format of response (short, body, headers, response, exchange, none)')
    .option(
      '--output-failed <output>',
      'output format of failed response (short, body, headers, response, exchange, none)'
    )
    .option('--raw', 'prevent formatting of response body')
    .option('--quiet', '')
    .option('--repeat <count>', 'repeat count for requests', toNumber)
    .option('--repeat-mode <mode>', 'repeat mode: sequential, parallel (default)')
    .option('-s, --silent', 'log only request')
    .option('--timeout <timeout>', 'maximum time allowed for connections', toNumber)
    .option('--var  <variables...>', 'list of variables')
    .option('-v, --verbose', 'make the operation more talkative')
    .action(execute);
  return program;
}

async function execute(fileName: string, options: SendOptions): Promise<void> {
  const context = convertCliOptionsToContext(options);
  const httpFiles: models.HttpFile[] = await getHttpFiles(fileName, options, context.config);

  if (httpFiles.length > 0) {
    let isFirstRequest = true;
    const jsonOutput: Record<string, Array<models.HttpRegion>> = {};
    while (options.interactive || isFirstRequest) {
      const selection = await selectAction(httpFiles, options);

      const processedHttpRegions: Array<models.HttpRegion> = [];

      if (selection) {
        await send(Object.assign({ processedHttpRegions }, context, selection));
        jsonOutput[fileProvider.toString(selection.httpFile.fileName)] = [...processedHttpRegions];
      } else {
        for (const httpFile of httpFiles) {
          if (!options.json && context.scriptConsole && httpFiles.length > 1) {
            context.scriptConsole.info(`--------------------- ${httpFile.fileName}  --`);
          }
          await send(Object.assign({ processedHttpRegions }, context, { httpFile }));
          jsonOutput[fileProvider.toString(httpFile.fileName)] = [...processedHttpRegions];
          processedHttpRegions.length = 0;
        }
      }
      isFirstRequest = false;

      if (
        options.json ||
        Object.keys(jsonOutput).length > 1 ||
        Object.entries(jsonOutput).some(([, httpRegions]) => httpRegions.length > 1)
      ) {
        const cliJsonOutput = toSendJsonOutput(jsonOutput, options);
        if (options.json) {
          console.info(JSON.stringify(cliJsonOutput, null, 2));
        } else if (context.scriptConsole) {
          context.scriptConsole.info('');
          context.scriptConsole.info(
            chalk`{bold ${cliJsonOutput.summary.totalRequests}} requests tested ({green ${cliJsonOutput.summary.successRequests} succeeded}, {red ${cliJsonOutput.summary.failedRequests} failed})`
          );
        }
      }
    }
  } else {
    console.error(`httpYac cannot find the specified file ${fileName}.`);
  }
}

function toNumber(value: string) {
  if (value) {
    const val = Number(value);
    if (!Number.isNaN(val)) {
      return val;
    }
  }
  return undefined;
}

export function convertCliOptionsToContext(cliOptions: SendOptions) {
  const context: Omit<models.HttpFileSendContext, 'httpFile'> = {
    repeat: cliOptions.repeat
      ? {
          count: cliOptions.repeat,
          type:
            cliOptions['repeat-mode'] === 'sequential' ? models.RepeatOrder.sequential : models.RepeatOrder.parallel,
        }
      : undefined,
    scriptConsole: new Logger({
      level: getLogLevel(cliOptions),
      onlyFailedTests: cliOptions.filter === SendFilterOptions.onlyFailed,
    }),
    config: {
      log: {
        level: getLogLevel(cliOptions),
      },
      request: {
        timeout: cliOptions.timeout,
        https: cliOptions.insecure ? { rejectUnauthorized: false } : undefined,
      },
    },
    logStream: cliOptions.json ? undefined : getStreamLogger(cliOptions),
    logResponse: cliOptions.json ? undefined : getRequestLogger(cliOptions),
    variables: cliOptions.var
      ? Object.fromEntries(
          cliOptions.var.map(obj => {
            const split = obj.split('=');
            return [split[0], split.slice(1).join('=')];
          })
        )
      : undefined,
  };

  return context;
}

function initCliHooks(httpFiles: Array<models.HttpFile>, cliOptions: SendOptions) {
  if (httpFiles.length > 0) {
    if (cliOptions.bail) {
      const bailOnFailedTest = {
        afterTrigger: async function bail(context: models.HookTriggerContext<models.ProcessorContext, boolean>) {
          const failedTest = context.arg.httpRegion.testResults?.find?.(obj => !obj.result);
          if (failedTest) {
            throw failedTest.error || new Error('bail on failed test');
          }
          return true;
        },
      };
      for (const httpFile of httpFiles) {
        httpFile.httpRegions.forEach(httpRegion => httpRegion.hooks.execute.addInterceptor(bailOnFailedTest));
      }
    }
  }
}

async function getHttpFiles(fileName: string, options: SendOptions, config: models.EnvironmentConfig | undefined) {
  const httpFiles: models.HttpFile[] = [];
  const httpFileStore = new HttpFileStore();

  const parseOptions: HttpFileStoreOptions = {
    workingDir: process.cwd(),
    activeEnvironment: options.env,
    config,
  };

  const paths = await globby(fileName, {
    expandDirectories: {
      files: ['*.rest', '*.http'],
      extensions: ['http', 'rest'],
    },
  });

  for (const path of paths) {
    const httpFile = await httpFileStore.getOrCreate(
      path,
      async () => await fs.readFile(path, 'utf8'),
      0,
      parseOptions
    );
    httpFiles.push(httpFile);
  }

  initCliHooks(httpFiles, options);
  return httpFiles;
}

type SelectActionResult = { httpRegion?: models.HttpRegion | undefined; httpFile: models.HttpFile } | false;

async function selectAction(httpFiles: models.HttpFile[], cliOptions: SendOptions): Promise<SelectActionResult> {
  if (httpFiles.length === 1) {
    const httpFile = httpFiles[0];
    const httpRegion = getHttpRegion(httpFile, cliOptions);
    if (httpRegion) {
      return {
        httpFile,
        httpRegion,
      };
    }
  }

  if (!cliOptions.all) {
    const httpRegionMap: Record<string, { httpRegion?: models.HttpRegion | undefined; httpFile: models.HttpFile }> = {};
    const hasManyFiles = httpFiles.length > 1;
    for (const httpFile of httpFiles) {
      httpRegionMap[hasManyFiles ? `${httpFile.fileName}: all` : 'all'] = { httpFile };

      for (const httpRegion of httpFile.httpRegions) {
        if (httpRegion.request) {
          const name = httpRegion.symbol.name;
          httpRegionMap[hasManyFiles ? `${httpFile.fileName}: ${name}` : name] = {
            httpRegion,
            httpFile,
          };
        }
      }
    }
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'region',
        message: 'please choose which region to use',
        choices: Object.entries(httpRegionMap).map(([key]) => key),
      },
    ]);
    if (answer.region && httpRegionMap[answer.region]) {
      return httpRegionMap[answer.region];
    }
  }
  return false;
}

function getHttpRegion(httpFile: models.HttpFile, cliOptions: SendOptions): models.HttpRegion | false {
  let httpRegion: models.HttpRegion | false = false;
  if (cliOptions.name) {
    httpRegion = httpFile.httpRegions.find(obj => obj.metaData.name === cliOptions.name) || false;
  } else {
    httpRegion =
      httpFile.httpRegions.find(
        obj => cliOptions.line && obj.symbol.startLine <= cliOptions.line && obj.symbol.endLine >= cliOptions.line
      ) || false;
  }
  return httpRegion;
}

function getStreamLogger(options: SendOptions): models.StreamLogger | undefined {
  if (options.output !== 'none') {
    return async function logStream(_channel, type, message) {
      const data = Buffer.isBuffer(message) ? message.toString('utf-8') : message;
      console.info(`${new Date().toLocaleTimeString()} - ${type}: `, data);
    };
  }
  return undefined;
}

function getRequestLogger(options: SendOptions): models.RequestLogger | undefined {
  const requestLoggerOptions = getRequestLoggerOptions(
    options.output,
    options.filter === SendFilterOptions.onlyFailed,
    !options.raw
  );
  if (requestLoggerOptions) {
    return utils.requestLoggerFactory(
      console.info,
      requestLoggerOptions,
      options['output-failed']
        ? getRequestLoggerOptions(
            options['output-failed'],
            options.filter === SendFilterOptions.onlyFailed,
            !options.raw
          )
        : undefined
    );
  }
  return undefined;
}
function getRequestLoggerOptions(
  output: string | undefined,
  onlyFailed: boolean,
  responseBodyPrettyPrint: boolean
): utils.RequestLoggerFactoryOptions | undefined {
  switch (output) {
    case 'body':
      return {
        responseBodyLength: 0,
        responseBodyPrettyPrint,
        onlyFailed,
      };
    case 'headers':
      return {
        requestOutput: true,
        requestHeaders: true,
        responseHeaders: true,
        onlyFailed,
      };
    case 'response':
      return {
        responseHeaders: true,
        responseBodyPrettyPrint,
        responseBodyLength: 0,
        onlyFailed,
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
        responseBodyPrettyPrint,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: 0,
        onlyFailed,
      };
  }
}
