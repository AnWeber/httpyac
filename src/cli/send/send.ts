import { default as chalk } from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'fs';
import type { Options } from 'globby';
import { sep } from 'path';

import { send } from '../../httpYacApi';
import { Logger } from '../../io';
import * as models from '../../models';
import { HttpFileStore } from '../../store';
import * as utils from '../../utils';
import { toSendJsonOutput } from './jsonOutput';
import { getLogLevel, OutputType, SendFilterOptions, SendOptions } from './options';
import { createCliPluginRegister } from './plugin';
import { toJunitXml } from './junitUtils';

export function sendCommand() {
  const program = new Command('send')
    .description('send/ execute http files')
    .usage('<fileName...> [options]')
    .argument('<fileName...>', 'path to file or glob pattern')
    .option('-a, --all', 'execute all http requests in a http file')
    .option('--bail', 'stops when a test case fails')
    .option('-e, --env  <env...>', 'list of environments')
    .option('--filter <filter>', ' filter requests output (only-failed)')
    .option('--insecure', 'allow insecure server connections when using ssl')
    .option('-i --interactive', 'do not exit the program after request, go back to selection')
    .option('--json', 'use json output')
    .option('--junit', 'use junit xml output')
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
    .option('--repeat <count>', 'repeat count for requests', utils.toNumber)
    .option('--repeat-mode <mode>', 'repeat mode: sequential, parallel (default)')
    .option('--parallel <count>', 'send parallel requests', utils.toNumber)
    .option('-s, --silent', 'log only request')
    .option('--timeout <timeout>', 'maximum time allowed for connections', utils.toNumber)
    .option('--var  <variables...>', 'list of variables')
    .option('-v, --verbose', 'make the operation more talkative')
    .action(execute);
  return program;
}

async function execute(fileNames: Array<string>, options: SendOptions): Promise<void> {
  const context = convertCliOptionsToContext(options);
  const { httpFiles, config } = await getHttpFiles(fileNames, options, context.config || {});
  context.config = config;
  initRequestLogger(options, context);
  try {
    if (httpFiles.length > 0) {
      let isFirstRequest = true;
      while (options.interactive || isFirstRequest) {
        isFirstRequest = false;
        const selection = await selectAction(httpFiles, options);

        context.processedHttpRegions = [];

        if (selection) {
          await send(Object.assign({}, context, selection));
        } else {
          const sendFuncs = httpFiles.map(
            httpFile =>
              async function sendHttpFile() {
                if (!options.junit && !options.json && context.scriptConsole && httpFiles.length > 1) {
                  context.scriptConsole.info(`--------------------- ${httpFile.fileName}  --`);
                }
                await send(Object.assign({}, context, { httpFile }));
              }
          );
          await utils.promiseQueue(options.parallel || 1, ...sendFuncs);
        }
        reportOutput(context, options);
      }
    } else {
      console.error(`httpYac cannot find the specified file ${fileNames.join(', ')}.`);
    }
  } finally {
    context.scriptConsole?.flush?.();
  }
}

function reportOutput(context: Omit<models.HttpFileSendContext, 'httpFile'>, options: SendOptions) {
  const processedHttpRegions = context.processedHttpRegions || [];

  const cliJsonOutput = toSendJsonOutput(processedHttpRegions, options);
  if (options.json) {
    console.info(utils.stringifySafe(cliJsonOutput, 2));
  } else if (options.junit) {
    console.info(toJunitXml(cliJsonOutput));
  } else if (context.scriptConsole) {
    context.scriptConsole.info('');
    context.scriptConsole.info(
      chalk`{bold ${cliJsonOutput.summary.totalRequests}} requests processed ({green ${cliJsonOutput.summary.successRequests} succeeded}, {red ${cliJsonOutput.summary.failedRequests} failed})`
    );
  }
}

export function convertCliOptionsToContext(cliOptions: SendOptions) {
  const context: Omit<models.HttpFileSendContext, 'httpFile'> = {
    activeEnvironment: cliOptions.env,
    repeat: cliOptions.repeat
      ? {
          count: cliOptions.repeat,
          type: cliOptions.repeatMode === 'sequential' ? models.RepeatOrder.sequential : models.RepeatOrder.parallel,
        }
      : undefined,
    config: {
      log: {
        level: getLogLevel(cliOptions),
      },
      request: {
        timeout: cliOptions.timeout,
        https: cliOptions.insecure ? { rejectUnauthorized: false } : undefined,
      },
      defaultHeaders: {
        Accept: '*/*',
        'User-Agent': 'httpyac',
      },
    },
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

export function initRequestLogger(cliOptions: SendOptions, context: Omit<models.HttpFileSendContext, 'httpFile'>) {
  const scriptConsole = new Logger({
    level: getLogLevel(cliOptions),
    onlyFailedTests: cliOptions.filter === SendFilterOptions.onlyFailed,
  });
  scriptConsole.collectMessages();
  context.scriptConsole = scriptConsole;
  if (!cliOptions.json && !cliOptions.junit) {
    context.logStream = getStreamLogger(cliOptions);
    const logger = getRequestLogger(cliOptions, context.config, scriptConsole);
    context.logResponse = async (response, httpRegion) => {
      if (logger) {
        await logger(response, httpRegion);
      }
      scriptConsole.flush();
    };
  }
}

async function getHttpFiles(fileNames: Array<string>, options: SendOptions, config: models.EnvironmentConfig) {
  const httpFiles: models.HttpFile[] = [];
  const httpFileStore = new HttpFileStore({
    cli: createCliPluginRegister(!!options.bail),
  });

  const parseOptions: models.HttpFileStoreOptions = {
    workingDir: process.cwd(),
    config,
  };
  const paths: Array<string> = [];

  for (const fileName of fileNames) {
    paths.push(...(await queryGlobbyPattern(fileName)));
  }
  for (const path of paths) {
    const httpFile = await httpFileStore.getOrCreate(
      path,
      async () => await fs.readFile(path, 'utf8'),
      0,
      parseOptions
    );
    httpFiles.push(httpFile);
  }

  return {
    httpFiles,
    config: parseOptions.config,
  };
}

async function queryGlobbyPattern(fileName: string) {
  const globOptions: Options = {
    gitignore: true,
  };
  const { globby } = await import('globby');
  const paths = await globby(fileName, globOptions);
  if ((paths && paths.length > 0) || sep === '/') {
    return paths;
  }
  return await globby(fileName.replace(/\\/gu, '/'), globOptions);
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
    const answer = await (
      await import('inquirer')
    ).default.prompt([
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
    return async function logStream(type, response) {
      const data = Buffer.isBuffer(response.body) ? response.body.toString('utf-8') : response.body;
      console.info(`${new Date().toLocaleTimeString()} - ${type}: `, data);
    };
  }
  return undefined;
}

function getRequestLogger(
  options: SendOptions,
  config: models.EnvironmentConfig | undefined,
  logger: models.ConsoleLogHandler
): models.RequestLogger | undefined {
  const cliLoggerOptions = {
    onlyFailed: options.filter === SendFilterOptions.onlyFailed,
    responseBodyPrettyPrint: !options.raw,
  };
  const requestLoggerOptions = getRequestLoggerOptions(options.output, cliLoggerOptions, config?.log?.options);

  const requestFailedLoggerOptions = getRequestLoggerOptions(
    options.outputFailed,
    cliLoggerOptions,
    config?.log?.options
  );

  if (requestLoggerOptions || requestFailedLoggerOptions) {
    return utils.requestLoggerFactory(args => logger.info(args), requestLoggerOptions, requestFailedLoggerOptions);
  }
  return undefined;
}
function getRequestLoggerOptions(
  output: OutputType | undefined,
  ...options: Array<models.RequestLoggerFactoryOptions | undefined>
): models.RequestLoggerFactoryOptions | undefined {
  let result: models.RequestLoggerFactoryOptions | undefined;
  switch (output) {
    case 'body':
      result = {
        responseBodyLength: 0,
      };
      break;
    case 'headers':
      result = {
        requestOutput: true,
        requestHeaders: true,
        responseHeaders: true,
      };
      break;
    case 'response':
      result = {
        responseHeaders: true,
        responseBodyLength: 0,
      };
      break;
    case 'none':
      return undefined;
    case 'short':
      result = { useShort: true };
      break;
    case 'timings':
      result = {
        timings: true,
      };
      break;
    case 'exchange':
      result = {
        requestOutput: true,
        requestHeaders: true,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: 0,
        timings: true,
      };
      break;
    default:
      result = {
        requestOutput: true,
        requestHeaders: true,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: 0,
      };
      break;
  }

  return Object.assign({}, ...options, result);
}
