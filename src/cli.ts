/* eslint-disable no-console */
import arg from 'arg';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { join } from 'path';
import { EnvironmentConfig, HttpFile, HttpRegion, HttpSymbolKind, RepeatOptions, RepeatOrder, RequestLogger, SettingsConfig } from './models';
import { HttpFileStore } from './httpFileStore';
import { httpYacApi } from './httpYacApi';
import { LogLevel } from './logger';
import * as utils from './utils';
import { environmentStore } from './environments';
import { NoteMetaHttpRegionParser, SettingsScriptHttpRegionParser } from './parser';
import { ShowInputBoxVariableReplacer, ShowQuickpickVariableReplacer } from './variables/replacer';
import { testSymbols } from './actions';
import { default as globby } from 'globby';
import { PathLike, fileProvider } from './fileProvider';

interface HttpCliOptions {
  activeEnvironments?: Array<string>,
  allRegions?: boolean,
  editor?: boolean;
  fileName?: string,
  help?: boolean,
  httpRegionLine?: number,
  httpRegionName?: string,
  interactive?: boolean,
  output?: string,
  rejectUnauthorized?: boolean;
  repeat?: RepeatOptions,
  requestTimeout?: number;
  rootDir?: string;
  verbose?: boolean
  version?: boolean;
}


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
    const httpFiles: HttpFile[] = [];
    const httpFileStore = new HttpFileStore();

    if (cliOptions.editor) {
      const answer = await inquirer.prompt([{
        type: 'editor',
        message: 'input http request',
        name: 'httpFile'
      }]);
      const file = await httpFileStore.getOrCreate(process.cwd(), async () => answer.httpFile, 0);
      httpFiles.push(file);
    } else if (cliOptions.fileName) {
      const paths = await globby(cliOptions.fileName, {
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

    if (httpFiles.length > 0) {
      let isFirstRequest = true;
      while (cliOptions.interactive || isFirstRequest) {
        const selection = await selectAction(httpFiles, cliOptions);

        const context = {
          repeat: cliOptions.repeat,
          scriptConsole: console,
          logRequest: getRequestLogger(cliOptions.output),
        };
        if (selection) {
          await httpYacApi.send(Object.assign(context, selection));
        } else {
          for (const httpFile of httpFiles) {
            await httpYacApi.send(Object.assign(context, { httpFile }));
          }
        }
        isFirstRequest = false;
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


function parseCliOptions(rawArgs: string[]): HttpCliOptions | undefined {
  try {
    const args = arg(
      {
        '--all': Boolean,
        '--editor': Boolean,
        '--env': [String],
        '--help': Boolean,
        '--insecure': Boolean,
        '--interactive': Boolean,
        '--line': Number,
        '--name': String,
        '--output': String,
        '--repeat': Number,
        '--repeat-mode': String,
        '--root': String,
        '--timeout': Number,
        '--verbose': Boolean,
        '--version': Boolean,

        '-e': '--env',
        '-h': '--help',
        '-i': '--interactive',
        '-l': '--line',
        '-n': '--name',
        '-o': '--output',
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
      fileName: args._.length > 0 ? args._[args._.length - 1] : undefined,
      help: args['--help'],
      httpRegionLine: args['--line'],
      httpRegionName: args['--name'],
      interactive: args['--interactive'],
      output: args['--output'],
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
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
  return undefined;
}

function renderHelp() {
  const helpMessage = `send http requests of .http or .rest

usage: httpyac [options...] <file or glob pattern>
       --all          execute all http requests in a http file
       --editor       enter a new request and execute it
  -e   --env          list of environemnts
  -h   --help         help
       --insecure     allow insecure server connections when using ssl
  -i   --interactive  do not exit the program after request, go back to selection
  -l   --line         line of the http requests
  -n   --name         name of the http requests
  -o   --output       output format of response (short, body, headers, response, exchange, none)
  -r   --repeat       repeat count for requests
       --repeat-mode  repeat mode: sequential, parallel (default)
       --root         absolute path to root dir of project
       --timeout      maximum time allowed for connections
  -v   --verbose      make the operation more talkative
       --version      version of httpyac`;

  console.info(helpMessage);
}


async function selectAction(httpFiles: HttpFile[], cliOptions: HttpCliOptions): Promise<{ httpRegion?: HttpRegion | undefined, httpFile: HttpFile } | false> {
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
    const httpRegionMap: Record<string, { httpRegion?: HttpRegion | undefined, httpFile: HttpFile }> = {};
    const hasManyFiles = httpFiles.length > 0;
    for (const httpFile of httpFiles) {
      httpRegionMap[hasManyFiles ? `${httpFile.fileName}: all` : 'all'] = { httpFile };

      for (const httpRegion of httpFile.httpRegions) {
        if (httpRegion.request) {
          const line = httpRegion.symbol.children?.find(obj => obj.kind === HttpSymbolKind.requestLine)?.startLine || httpRegion.symbol.startLine;
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

function getHttpRegion(httpFile: HttpFile, cliOptions: HttpCliOptions): HttpRegion | false {
  let httpRegion: HttpRegion | false = false;
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

async function initEnviroment(cliOptions: HttpCliOptions): Promise<void> {
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

  const rootDir = cliOptions.rootDir || await utils.findPackageJson(process.cwd()) || process.cwd();
  await environmentStore.configure([rootDir], environmentConfig);
  initHttpYacApiExtensions(environmentConfig, rootDir);
  environmentStore.activeEnvironments = cliOptions.activeEnvironments;


  if (process.platform === 'win32') {

    // https://github.com/nodejs/node-v0.x-archive/issues/7940
    testSymbols.ok = '[x]';
    testSymbols.error = '[ ]';
  }
}

function initHttpYacApiExtensions(config: EnvironmentConfig & SettingsConfig, rootDir: PathLike | undefined) {
  httpYacApi.httpRegionParsers.push(new NoteMetaHttpRegionParser(async (note: string) => {
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'note',
      message: note,
    }]);
    return answer.note;
  }));
  httpYacApi.variableReplacers.splice(0, 0, new ShowInputBoxVariableReplacer(async (message: string, defaultValue: string) => {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'placeholder',
      message,
      default: defaultValue
    }]);
    return answer.placeholder;
  }));
  httpYacApi.variableReplacers.splice(0, 0, new ShowQuickpickVariableReplacer(async (message: string, values: string[]) => {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'placeholder',
      message,
      choices: values
    }]);
    return answer.placeholder;
  }));
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


function getRequestLogger(output: string | undefined): RequestLogger | undefined {
  switch (output) {
    case 'body':
      return utils.requestLoggerFactory(console.info, {
        isFirstRequest: true,
        responseBodyLength: 0,
      });
    case 'headers':
      return utils.requestLoggerFactory(console.info, {
        isFirstRequest: true,
        requestOutput: true,
        requestHeaders: true,
        responseHeaders: true,
      });
    case 'response':
      return utils.requestLoggerFactory(console.info, {
        isFirstRequest: true,
        responseHeaders: true,
        responseBodyLength: 0,
      });
    case 'none':
      return undefined;
    case 'short':
      return utils.requestLoggerFactoryShort(console.info);
    case 'exchange':
    default:
      return utils.requestLoggerFactory(console.info, {
        isFirstRequest: true,
        requestOutput: true,
        requestHeaders: true,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: 0,
      });
  }
}
