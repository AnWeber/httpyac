import { HttpFileStore } from '../store';
import { EnvironmentConfig } from './environmentConfig';
import { PathLike } from './pathLike';

export interface ParseOptions {
  httpFileStore: HttpFileStore;
  config?: EnvironmentConfig;
  workingDir?: PathLike;
  activeEnvironment?: string[] | undefined;
}
