import { ClientCertificateOptions } from './clientCertifcateOptions';
import { HttpyacHooksApi } from './httpHooksApi';
import { HttpRequest } from './httpRequest';
import { LogLevel } from './logHandler';
import { Variables } from './variables';

export interface EnvironmentConfig {
  cookieJarEnabled?: boolean;
  log?: {
    /** log level of outputs */
    level?: LogLevel;

    /** enable ansi color support */
    supportAnsiColors?: boolean;
  };

  request?: HttpRequest;
  proxy?: string;
  /** count auf characters before pretty print is ommited (default: 1000000)*/
  requestPrettyPrintBodyMaxSize?: number;
  requestBodyInjectVariablesExtensions?: Array<string>;
  clientCertificates?: Record<string, ClientCertificateOptions>;
  /** default request headers if not overwritten */
  defaultHeaders?: Record<string, string>;

  /** environment variables  */
  environments?: Record<string, Variables>;
  /** relative or absoulte path to env dir */
  envDirName?: string;
  useRegionScopedVariables?: boolean;
  /** hookApi for extending httpyac */
  configureHooks?: ConfigureHooks;
  /** configuration for plugins */
  plugins?: Record<string, unknown>;
}

export type ConfigureHooks = (api: HttpyacHooksApi) => void | Promise<void>;
