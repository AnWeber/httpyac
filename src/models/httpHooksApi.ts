import { HookCancel as hookPointHookCancel } from 'hookpoint';

import * as utils from '../utils';
import { EnvironmentConfig } from './environmentConfig';
import { FileProvider } from './fileProvider';
import { HttpFileHooks } from './hooks';
import { HttpClientProvider } from './httpClientProvider';
import { HttpFile } from './httpFile';
import { JavascriptProvider } from './javascriptProvider';
import { LogHandler } from './logHandler';
import { PathLike } from './pathLike';
import { SessionStore } from './sessionStore';
import { UserInteractionProvider } from './userInteractionProvider';

export const HookCancel: typeof hookPointHookCancel = hookPointHookCancel;

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
  readonly httpClientProvider: HttpClientProvider;
  readonly javascriptProvider: JavascriptProvider;
  readonly utils: typeof utils;
  getHookCancel(): typeof HookCancel;
}
