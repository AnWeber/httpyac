import * as utils from '../utils';
import { EnvironmentConfig } from './environmentConfig';
import { FileProvider } from './fileProvider';
import { HookCancel } from './hook';
import { HttpFile } from './httpFile';
import { HttpFileHooks } from './httpFileHooks';
import { LogHandler } from './logHandler';
import { PathLike } from './pathLike';
import { SessionStore } from './sessionStore';
import { UserInteractionProvider } from './userInteractionProvider';

export interface HttpyacHooksApi {
  readonly version: string;
  readonly rootDir?: PathLike;
  readonly httpFile: Readonly<HttpFile>;
  readonly config: EnvironmentConfig;
  readonly hooks: HttpFileHooks;
  readonly log: LogHandler;
  readonly fileProvider: FileProvider;
  readonly sessionStore: SessionStore;
  readonly userInteractionProvider: UserInteractionProvider;
  readonly utils: typeof utils;
  getHookCancel(): typeof HookCancel;
}
