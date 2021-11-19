import { EnvironmentConfig } from './environmentConfig';
import { FileProvider } from './fileProvider';
import { HookCancel } from './hook';
import { HttpFile } from './httpFile';
import { HttpFileHooks } from './httpFileHooks';
import { LogHandler } from './logHandler';
import { PathLike } from './pathLike';
import { SessionStore } from './sessionStore';
import { UserInteractonProvider } from './userInteractonProvider';

export interface HttpyacHooksApi {
  readonly version: string;
  readonly rootDir?: PathLike;
  readonly httpFile: Readonly<HttpFile>;
  readonly config: EnvironmentConfig;
  readonly hooks: HttpFileHooks;
  readonly log: LogHandler;
  readonly fileProvider: FileProvider;
  readonly sessionStore: SessionStore;
  readonly userInteractionProvider: UserInteractonProvider;
  getHookCancel(): typeof HookCancel;
}
