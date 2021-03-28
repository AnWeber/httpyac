import arg from 'arg';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { join, isAbsolute, dirname } from 'path';
import { EnvironmentConfig, HttpFile, HttpFileSendContext, HttpRegionSendContext, HttpSymbolKind, RepeatOptions, RepeatOrder, SettingsConfig } from './models';
import { initHttpClient } from './gotHttpClientFactory';
import { httpFileStore } from './httpFileStore';
import { httpYacApi } from './httpYacApi';
import { log, logRequest } from './logger';
import { findPackageJson, parseJson } from './utils';
import { environmentStore } from './environments';
import { DefaultHeadersHttpRegionParser, NoteMetaHttpRegionParser, SettingsScriptHttpRegionParser } from './parser';
import { showInputBoxVariableReplacerFactory, showQuickpickVariableReplacerFactory } from './variables/replacer';

// TODO progress ?,
// TODO log umbiegen auf inquirer bar


interface HttpCliOptions{
  fileName?: string,
  allRegions?: boolean,
  httpRegionLine?: number,
  httpRegionName?: string,
  activeEnvironments?: Array<string>,
  repeat?: RepeatOptions,
  help?: boolean,
  verbose?: boolean
  requestTimeout?: number;
  disableSslCertficateValidation?: boolean;
}

const httpyacJsonFileName = '.httpac.json';

export async function send(rawArgs: string[]) {
  const cliOptions = parseCliOptions(rawArgs);
  if (!cliOptions) {
    return;
  }
  if (cliOptions.help || !cliOptions.fileName) {
    return renderHelp();
  }
  try {
    const fileName = isAbsolute(cliOptions.fileName) ? cliOptions.fileName : join(process.cwd(), cliOptions.fileName);
    const environmentConfig = await initEnviroment(cliOptions);
    const httpFile = await httpFileStore.getOrCreate(cliOptions.fileName, async () => await fs.readFile(fileName, 'utf8'), 0);

    const sendContext = await getSendContext(httpFile, cliOptions, environmentConfig);

    await httpYacApi.send(sendContext);
  } catch (err) {
    log.error(err);
  }
  process.exit();
}


function parseCliOptions(rawArgs: string[]): HttpCliOptions | undefined {
  try {
    const args = arg(
      {
        '--all': Boolean,
        '--env': [String],
        '--name': String,
        '--help': Boolean,
        '--insecure': Boolean,
        '--line': Number,
        '--repeat': Number,
        '--repeat-mode': String,
        '--timeout': Number,
        '--verbose': Boolean,

        '-e': '--env',
        '-n': '--name',
        '-l': '--line',
        '-h': '--help',
        '-v': '--verbose'
      },
      {
        argv: rawArgs.slice(2),
      }
    );

    return {
      fileName: args._.length > 0 ?  args._[args._.length - 1] : undefined,
      allRegions: args['--all'],
      httpRegionLine: args['--line'],
      httpRegionName: args['--name'],
      activeEnvironments: args['--env'],
      repeat: args['--repeat'] ? {
        count: args['--repeat'],
        type: args['--repeat-mode'] === 'sequential' ? RepeatOrder.sequential : RepeatOrder.parallel,
      } : undefined,
      help: args['--help'],
      verbose: args['--verbose'],
      requestTimeout: args['--timeout'],
      disableSslCertficateValidation: args['--insecure']
    };
  } catch (error) {
    if (error instanceof arg.ArgError) {
      log.error(error.message);
    } else {
      log.error(error);
    }
  }
  return undefined;
}

function renderHelp() {


  const helpMessages = [
    `send http requests of .http or .rest`,
    '',
    `usage: httpyac [options...] <file>`,
    '       --all          execute all regions in a http file',
    '       --timeout      maximum time allowed for connections',
    '  -e   --env          list of environemnts',
    '  -h   --help         help',
    '       --insecure     allow insecure server connections when using ssl',
    '  -l   --line         line of the region',
    '  -n   --name         name of the region',
    '  -r   --repeat       repeat count for requests',
    '       --repeat-mode  repeat mode: sequential, parallel (default)',
    '  -v   --verbose      make the operation more talkative'
  ];

  helpMessages.forEach(obj => console.info(obj));
}


async function getSendContext(httpFile: HttpFile, cliOptions: HttpCliOptions, environmentConfig: SettingsConfig): Promise<HttpFileSendContext | HttpRegionSendContext> {
  const sendContext: any = {
    httpFile,
    httpClient: initHttpClient(environmentConfig),
    repeat: cliOptions.repeat,
  };

  if (cliOptions.httpRegionName) {
    sendContext.httpRegion = httpFile.httpRegions.find(obj => obj.metaData.name === cliOptions.httpRegionName);
  }else if (cliOptions.httpRegionLine) {
    sendContext.httpRegion = httpFile.httpRegions.find(obj => cliOptions.httpRegionLine && obj.symbol.startLine <= cliOptions.httpRegionLine && obj.symbol.endLine >= cliOptions.httpRegionLine);
  } else if (!cliOptions.allRegions && httpFile.httpRegions.length > 1) {

    const httpRegionMap = httpFile.httpRegions.reduce((prev: Record<string, any>, current) => {
      if (current.request) {
        const line = current.symbol.children?.find(obj => obj.kind === HttpSymbolKind.requestLine)?.startLine || current.symbol.startLine;
        const name = current.metaData.name || `${current.request.method} ${current.request.url} (line ${line + 1})`;
        prev[name] = current;
      }
      return prev;
    }, {
      'all': false
    });

    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'region',
      message: 'please choose which region to use',
      choices: Object.entries(httpRegionMap).map(([key]) => key),
    }]);
    if (answer.region && httpRegionMap[answer.region]) {
      sendContext.httpRegion = httpRegionMap[answer.region];
    }
  }
  return sendContext;
}

async function initEnviroment(cliOptions: HttpCliOptions) {
  if (cliOptions.verbose) {
    log.level = 0;
  }
  logRequest.prettyPrint = true;
  const rootDir = await findPackageJson(process.cwd());
  let config: EnvironmentConfig & SettingsConfig = {};
  if (rootDir) {
    config = await parseJson(join(rootDir, httpyacJsonFileName));
    if (!config) {
      const packageJson = await parseJson(join(rootDir, 'package.json'));
      if (packageJson) {
        config = packageJson['httpyac'];
      }
    }
    if (!config) {
      config = {
        dotenvDefaultFiles: ['.env'],
        dotenvDirs: [rootDir, join(rootDir, 'env')],
      };
    }

    if (cliOptions.requestTimeout) {
      config.requestTimeout = cliOptions.requestTimeout;
    }
    if (cliOptions.disableSslCertficateValidation) {
      config.requestSslCertficateValidation = false;
    }
  }

  const environmentConfig: EnvironmentConfig & SettingsConfig = Object.assign({
    requestFollowRedirect: true,
    requestSslCertficateValidation: true
  }, config);

  await environmentStore.configure(environmentConfig);
  initHttpYacApiExtensions(environmentConfig, rootDir);
  environmentStore.activeEnvironments = cliOptions.activeEnvironments;

  return environmentConfig;
}

function initHttpYacApiExtensions(config: EnvironmentConfig & SettingsConfig, rootDir: string | undefined) {
  httpYacApi.httpRegionParsers.push(new DefaultHeadersHttpRegionParser(() => config.requestDefaultHeaders));
  httpYacApi.httpRegionParsers.push(new NoteMetaHttpRegionParser(async (note: string) => {
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'note',
      message: note,
    }]);
    return answer.note;
  }));
  httpYacApi.variableReplacers.splice(0, 0, showInputBoxVariableReplacerFactory(async (message: string, defaultValue: string) => {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'placeholder',
      message,
      default: defaultValue
    }]);
    return answer.placeholder;
  }));
  httpYacApi.variableReplacers.splice(0, 0, showQuickpickVariableReplacerFactory(async (message: string, values: string[]) => {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'placeholder',
      message: message,
      choices: values
    }]);
    return answer.placeholder;
  }));
  if (rootDir && config.httpRegionScript) {
    httpYacApi.httpRegionParsers.push(new SettingsScriptHttpRegionParser(async () => {
      let fileName = config.httpRegionScript;
      if (fileName) {
        if (!isAbsolute(fileName)) {
          fileName = join(rootDir, fileName);
        }
        try {
          const script = await fs.readFile(fileName, 'utf-8');
          return { script, lineOffset: 0 };
        } catch (err) {
          log.trace(`file not found: ${fileName}`);
        }
      }
      return undefined;
    }));
  }
}
