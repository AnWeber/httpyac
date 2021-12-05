import { LogLevel } from '../../models';

export enum SendFilterOptions {
  onlyFailed = 'only-failed',
}

export interface SendOptions {
  env?: Array<string>;
  all?: boolean;
  bail?: boolean;
  filter?: SendFilterOptions;
  help?: boolean;
  line?: number;
  name?: string;
  interactive?: boolean;
  insecure?: boolean;
  json?: boolean;
  output?: string;
  'output-failed'?: string;
  raw?: boolean;
  'repeat-mode'?: 'sequential' | 'parallel';
  repeat?: number;
  timeout?: number;
  silent?: boolean;
  var?: Array<string>;
  verbose?: boolean;
}

export function getLogLevel(cliOptions: SendOptions): LogLevel | undefined {
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
