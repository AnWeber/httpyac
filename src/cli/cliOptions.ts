import { RepeatOptions, RepeatOrder, LogLevel } from '../models';
import arg from 'arg';

export enum CliFilterOptions {
  onlyFailed = 'only-failed',
}

export interface CliOptions {
  activeEnvironments?: Array<string>;
  allRegions?: boolean;
  bail?: boolean;
  editor?: boolean;
  fileName?: string;
  filter?: string;
  help?: boolean;
  httpRegionLine?: number;
  httpRegionName?: string;
  interactive?: boolean;
  json?: boolean;
  output?: string;
  outputFailed?: string;
  raw?: boolean;
  rejectUnauthorized?: boolean;
  repeat?: RepeatOptions;
  requestTimeout?: number;
  silent?: boolean;
  variables?: Array<string>;
  verbose?: boolean;
  version?: boolean;
}

export function getLogLevel(cliOptions: CliOptions): LogLevel | undefined {
  if (cliOptions.json) {
    return LogLevel.none;
  }
  if (cliOptions.silent) {
    return LogLevel.error;
  }
  if (cliOptions.verbose) {
    return LogLevel.trace;
  }
  return undefined;
}

export function parseCliOptions(rawArgs: string[]): CliOptions | undefined {
  try {
    const args = arg(
      {
        '--all': Boolean,
        '--bail': Boolean,
        '--editor': Boolean,
        '--env': [String],
        '--filter': String,
        '--help': Boolean,
        '--insecure': Boolean,
        '--interactive': Boolean,
        '--json': Boolean,
        '--line': Number,
        '--name': String,
        '--no-color': Boolean,
        '--output': String,
        '--output-failed': String,
        '--raw': Boolean,
        '--quiet': Boolean,
        '--repeat': Number,
        '--repeat-mode': String,
        '--silent': Boolean,
        '--timeout': Number,
        '--var': [String],
        '--verbose': Boolean,
        '--version': Boolean,

        '-e': '--env',
        '-h': '--help',
        '-i': '--interactive',
        '-l': '--line',
        '-n': '--name',
        '-o': '--output',
        '-s': '--silent',
        '-v': '--verbose',
      },
      {
        argv: rawArgs.slice(2),
      }
    );

    return {
      activeEnvironments: args['--env'],
      allRegions: args['--all'],
      bail: args['--bail'],
      editor: args['--editor'],
      fileName: args._.length > 0 ? args._[args._.length - 1] : undefined,
      filter: args['--filter'],
      help: args['--help'],
      httpRegionLine: args['--line'],
      httpRegionName: args['--name'],
      interactive: args['--interactive'],
      json: args['--json'],
      output: args['--output'],
      outputFailed: args['--output-failed'],
      raw: args['--raw'],
      rejectUnauthorized: args['--insecure'] !== undefined ? !args['--insecure'] : undefined,
      repeat: args['--repeat']
        ? {
            count: args['--repeat'],
            type: args['--repeat-mode'] === 'sequential' ? RepeatOrder.sequential : RepeatOrder.parallel,
          }
        : undefined,
      requestTimeout: args['--timeout'],
      silent: args['--silent'],
      variables: args['--var'],
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

export function renderHelp(): void {
  const helpMessage = `send http requests of .http or .rest

usage: httpyac [options...] <file or glob pattern>
       --all           execute all http requests in a http file
       --bail          stops when a test case fails
       --editor        enter a new request and execute it
  -e   --env           list of environments
       --filter        filter requests output (only-failed)
  -h   --help          help
       --insecure      allow insecure server connections when using ssl
  -i   --interactive   do not exit the program after request, go back to selection
       --json          use json output
  -l   --line          line of the http requests
  -n   --name          name of the http requests
       --no-color      disable color support
  -o   --output        output format of response (short, body, headers, response, exchange, none)
       --output-failed output format of failed response (short, body, headers, response, exchange, none)
       --raw           prevent formatting of response body
  -r   --repeat        repeat count for requests
       --repeat-mode   repeat mode: sequential, parallel (default)
  -s   --silent        log only request
       --timeout       maximum time allowed for connections
       --var           set variables
  -v   --verbose       make the operation more talkative
       --version       version of httpyac`;

  console.info(helpMessage);
}
