import arg from 'arg';
import { RepeatOptions, RepeatOrder, LogLevel } from '../models';
import { Command } from 'commander';

export enum CliFilterOptions {
  onlyFailed = 'only-failed',
}

export interface CliOptions {
  activeEnvironments?: Array<string>,
  allRegions?: boolean,
  editor?: boolean;
  fileName?: string,
  filter?: string;
  help?: boolean,
  httpRegionLine?: number,
  httpRegionName?: string,
  interactive?: boolean,
  json?: boolean;
  output?: string,
  outputFailed?: string,
  raw?: boolean,
  rejectUnauthorized?: boolean;
  repeat?: RepeatOptions,
  requestTimeout?: number;
  silent?: boolean;
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
    const program = new Command();

    program
      .option('-a, --all', 'execute all http requests in a http file')      
      .option('-e, --env', 'list of environemnts')
      .option('--filter', ' filter requests output (only-failed)')     
      .option('--insecure', 'allow insecure server connections when using ssl')
      .option('-i --interactive', 'do not exit the program after request, go back to selection')
      .option('--json', 'use json output')
      .option('-l, --line', 'line of the http requests')
      .option('-n, --name', 'name of the http requests')
      .option('--no-color', 'disable color support')
      .option('-o, --output', 'output format of response (short, body, headers, response, exchange, none)')
      .option('--output-failed', 'output format of failed response (short, body, headers, response, exchange, none)')
      .option('--raw', 'prevent formatting of response body')
      .option('--quiet', '')
      .option('--repeat', 'repeat count for requests')
      .option('--repeat-mode', 'repeat mode: sequential, parallel (default)')
      .option('-s, --silent', 'log only request')
      .option('--timeout', 'maximum time allowed for connections')
      .option('-v, --verbose', 'make the operation more talkative')
      .option('--version', 'version of httpyac')

    program.parse(rawArgs);
    const options = program.opts();

    return Object.assign(options as CliOptions,{
      activeEnvironments: options['env'],
      allRegions: options['all'],
      httpRegionLine: options['line'],
      httpRegionName: options['name'],
      outputFailed: options['output-failed'],
      fileName: program.args.length > 0 ? program.args[program.args.length - 1] : undefined,
      rejectUnauthorized: options['--insecure'] !== undefined ? !options['--insecure'] : undefined,
      repeat: options.repeat ? {
        count: options.repeat,
        type: options['repeat-mode'] === 'sequential' ? RepeatOrder.sequential : RepeatOrder.parallel,
      } : undefined,
      requestTimeout: options['timeout']
    });
  } catch (error) {
    if (error instanceof arg.ArgError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
  return undefined;
}