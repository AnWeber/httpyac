import { LogLevel } from '../logger';
import { ClientCertificateOptions } from './clientCertifcateOptions';
import { HttpRequest } from './httpRequest';

export interface EnvironmentConfig{
  cookieJarEnabled?: boolean;
  log?: {
    /** log level of outputs */
    level?: LogLevel,
    /** enable ansi color support */
    supportAnsiColors?: boolean,
    isRequestLogEnabled?: boolean,
    responseBodyLength?: number,
    prettyPrint?: boolean,
  }
  /** default request headers if not overwritten */
  defaultHeaders?: Record<string, string>,

  /** environment variables  */
  environments?: Record<string, Record<string, any>>;
  clientCertificates?: Record<string, ClientCertificateOptions>,
  dotenv?: {
    enabled?: boolean;
    /** default dotenv files which is active in all profiles */
    defaultFiles?: string[];
    /** relative or absolute path to folder with dotenv files */
    dirname?: string;
    /** search for .env file next to *.http files */
    variableProviderEnabled?: boolean;
  },
  intellij?: {
    enabled?: boolean;
    /** relative or absolute path to folder with intellij variables files */
    dirname?: string;
    /** search for http-client.env.json file next to *.http files */
    variableProviderEnabled?: boolean;
  }
}

export interface SettingsConfig {
  request?: HttpRequest;


  proxy?: string;
  /** absolute or relative path to a script which gets executed for every http request in a file */
  httpRegionScript?: string;
}