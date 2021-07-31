import { PathLike, FileProvider } from '../io';
import { HttpFile, HttpFileHooks, LogLevel, LogHandler, SessionStore } from '../models';
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
  /** hookApi for extending httpyac */
  configureHooks?: ConfigureHooks;
  /** configuration for plugins */
  plugins?: Record<string, unknown>
}

export type ConfigureHooks = (api: HttpyacHooksApi) => void | Promise<void>;


export interface UserInteractonProvider{
  showNote: (note: string) => Promise<boolean>;
  showInputPrompt: (message: string, defaultValue?: string) => Promise<string | undefined>,
  showListPrompt: (message: string, values: string[]) => Promise<string | undefined>,
  showWarnMessage?: (message: string) => Promise<void>,
  showErrorMessage?: (message: string) => Promise<void>,
}

export interface HttpyacHooksApi{
  readonly version: string;
  readonly rootDir?: PathLike;
  readonly httpFile: Readonly<HttpFile>;
  readonly config: EnvironmentConfig;
  readonly hooks: HttpFileHooks;
  readonly log: LogHandler;
  readonly fileProvider: FileProvider,
  readonly sessionStore: SessionStore,
  readonly userInteractionProvider: UserInteractonProvider;
  getHookCancel(): symbol;
}
