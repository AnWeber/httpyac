import { LogLevel } from '../models';
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
}

export interface SettingsConfig {

  /** absolute or relative path to a script which gets executed for every http request in a file */
  httpRegionScript?: string;
}
