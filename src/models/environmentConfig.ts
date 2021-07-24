import { HttpFile, HttpFileHooks, LogLevel, LogHandler } from '../models';
import { ClientCertificateOptions } from './clientCertifcateOptions';
import { HttpRequest } from './httpRequest';
import { Variables } from './variables';

export interface EnvironmentConfig{
  cookieJarEnabled?: boolean;
  log?: {

    /** log level of outputs */
    level?: LogLevel,

    /** enable ansi color support */
    supportAnsiColors?: boolean,
  }

  request?: HttpRequest;
  proxy?: string;
  requestBodyInjectVariablesExtensions?: Array<string>;
  clientCertificates?: Record<string, ClientCertificateOptions>,
  /** default request headers if not overwritten */
  defaultHeaders?: Record<string, string>,

  /** environment variables  */
  environments?: Record<string, Variables>;
  /** relative or absoulte path to env dir */
  envDirName?: string;
  configureHooks?: (hooks: HttpFileHooks, context: {
    httpFile: HttpFile,
    log: LogHandler
  }) => void | Promise<void>;
}
