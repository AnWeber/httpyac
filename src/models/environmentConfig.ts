import { ClientCertificateOptions } from './clientCertificateOptions';
import { HttpyacHooksApi } from './httpHooksApi';
import { LogLevel } from './logHandler';
import { RequestLoggerFactoryOptions } from './requestLoggerFactoryOptions';
import { Variables } from './variables';

export interface EnvironmentConfig {
  cookieJarEnabled?:
    | boolean
    | {
        allowSpecialUseDomain?: boolean | undefined;
        looseMode?: boolean | undefined;
        rejectPublicSuffixes?: boolean | undefined;
        prefixSecurity?: string | undefined;
      };
  log?: {
    /** log level of outputs */
    level?: LogLevel;

    /** enable ansi color support */
    supportAnsiColors?: boolean;
    /** logger options for cli */
    options?: RequestLoggerFactoryOptions;
  };

  request?: ConfigRequest;
  proxy?: string;
  proxyExcludeList?: Array<string>;
  /** count auf characters before pretty print is ommited (default: 1000000)*/
  requestPrettyPrintBodyMaxSize?: number;
  requestBodyInjectVariablesExtensions?: Array<string>;
  clientCertificates?: Record<string, ClientCertificateOptions>;
  /** default request headers if not overwritten */
  defaultHeaders?: Record<string, string>;

  /** environment variables  */
  environments?: Record<string, Variables>;
  /** relative or absolute path to env dir */
  envDirName?: string;
  useRegionScopedVariables?: boolean;
  /** hookApi for extending httpyac */
  configureHooks?: ConfigureHooks;
  /** configuration for plugins */
  plugins?: Record<string, unknown>;
}

export interface ConfigRequest {
  timeout?: number;
  followRedirects?: boolean;
  rejectUnauthorized?: boolean;
  [key: string]: unknown;
}

export type ConfigureHooks = (api: HttpyacHooksApi) => void | Promise<void>;
