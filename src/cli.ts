import arg from 'arg';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { join, isAbsolute } from 'path';
import { EnvironmentConfig, HttpFile, HttpFileSendContext, HttpRegionSendContext, HttpSymbolKind, RepeatOptions, RepeatOrder, SettingsConfig } from './models';
import { gotHttpClientFactory } from './gotHttpClientFactory';
import { httpFileStore } from './httpFileStore';
import { httpYacApi } from './httpYacApi';
import { log, LogLevel } from './logger';
import { findPackageJson, parseJson } from './utils';
import { environmentStore } from './environments';
import { NoteMetaHttpRegionParser, SettingsScriptHttpRegionParser } from './parser';
import { showInputBoxVariableReplacerFactory, showQuickpickVariableReplacerFactory } from './variables/replacer';

interface HttpCliOptions{
  activeEnvironments?: Array<string>,
  allRegions?: boolean,
  editor?: boolean;
  fileName?: string,
  help?: boolean,
  httpRegionLine?: number,
  httpRegionName?: string,
  rejectUnauthorized?: boolean;
  repeat?: RepeatOptions,
  requestTimeout?: number;
  rootDir?: string;
  verbose?: boolean
  version?: boolean;
}


export async function send(rawArgs: string[]) {
  const cliOptions = parseCliOptions(rawArgs);
  if (!cliOptions) {
    return;
  }
  if (cliOptions.version) {
    const packageJson = await parseJson(join(__dirname, '../package.json'));
    console.info(`httpyac v${packageJson.version}`);
    return;
  }
  if (cliOptions.help) {
    return renderHelp();
  }
  const environmentConfig = await initEnviroment(cliOptions);

  try {
    let httpFile: HttpFile | undefined;

    if (cliOptions.editor) {
      const answer = await inquirer.prompt([{
        type: 'editor',
        message: 'input http request',
        name: 'httpFile'
      }]);
      httpFile = await httpFileStore.getOrCreate(process.cwd(), async () => answer.httpFile, 0);
    } else if (cliOptions.fileName) {
      const fileName = isAbsolute(cliOptions.fileName) ? cliOptions.fileName : join(process.cwd(), cliOptions.fileName);
      httpFile = await httpFileStore.getOrCreate(cliOptions.fileName, async () => await fs.readFile(fileName, 'utf8'), 0);
    }

    if (httpFile) {
      const sendContext = await getSendContext(httpFile, cliOptions, environmentConfig);
      await httpYacApi.send(sendContext);
    } else {
      return renderHelp();
    }

  } catch (err) {
    log.error(err);
  } finally {
    process.exit();
  }
}


function parseCliOptions(rawArgs: string[]): HttpCliOptions | undefined {
  try {
    const args = arg(
      {
        '--all': Boolean,
        '--editor': Boolean,
        '--env': [String],
        '--help': Boolean,
        '--insecure': Boolean,
        '--line': Number,
        '--name': String,
        '--repeat': Number,
        '--repeat-mode': String,
        '--root': String,
        '--timeout': Number,
        '--verbose': Boolean,
        '--version': Boolean,

        '-e': '--env',
        '-h': '--help',
        '-l': '--line',
        '-n': '--name',
        '-v': '--verbose'
      },
      {
        argv: rawArgs.slice(2),
      }
    );

    return {
      activeEnvironments: args['--env'],
      allRegions: args['--all'],
      editor: args['--editor'],
      fileName: args._.length > 0 ?  args._[args._.length - 1] : undefined,
      help: args['--help'],
      httpRegionLine: args['--line'],
      httpRegionName: args['--name'],
      rejectUnauthorized: args['--insecure'] !== undefined ? !args['--insecure'] : undefined,
      repeat: args['--repeat'] ? {
        count: args['--repeat'],
        type: args['--repeat-mode'] === 'sequential' ? RepeatOrder.sequential : RepeatOrder.parallel,
      } : undefined,
      requestTimeout: args['--timeout'],
      rootDir: args['--root'],
      verbose: args['--verbose'],
      version: args['--version'],
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
  const helpMessage = `send http requests of .http or .rest

usage: httpyac [options...] <file>
       --all          execute all http requests in a http file
       --editor       enter a new request and execute it
  -e   --env          list of environemnts
  -h   --help         help
       --insecure     allow insecure server connections when using ssl
  -l   --line         line of the http requests
  -n   --name         name of the http requests
  -r   --repeat       repeat count for requests
       --repeat-mode  repeat mode: sequential, parallel (default)
       --root         absolute path to root dir of project
       --timeout      maximum time allowed for connections
  -v   --verbose      make the operation more talkative
       --version      version of httpyac`;

  console.info(helpMessage);
}


async function getSendContext(httpFile: HttpFile, cliOptions: HttpCliOptions, environmentConfig: SettingsConfig): Promise<HttpFileSendContext | HttpRegionSendContext> {
  const request = {
    ...environmentConfig.request,
    proxy: process.env.http_proxy
  };
  const sendContext: any = {
    httpFile,
    httpClient: gotHttpClientFactory(request),
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
  const environmentConfig: EnvironmentConfig & SettingsConfig = {
    log: {
      level: cliOptions.verbose ? LogLevel.trace : undefined,
    },
    request: {
      timeout: cliOptions.requestTimeout,
      https: {
        rejectUnauthorized: cliOptions.rejectUnauthorized
      }
    }
  };

  const rootDir = cliOptions.rootDir || await findPackageJson(process.cwd()) || process.cwd();
  await environmentStore.configure([rootDir], environmentConfig,);
  initHttpYacApiExtensions(environmentConfig, rootDir);
  environmentStore.activeEnvironments = cliOptions.activeEnvironments;

  return environmentConfig;
}

function initHttpYacApiExtensions(config: EnvironmentConfig & SettingsConfig, rootDir: string | undefined) {
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
