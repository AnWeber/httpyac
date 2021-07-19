import { PathLike } from '../io';
import { HttpFileStore } from '../store';
import { EnvironmentConfig } from './environmentConfig';


export interface ParseOptions {
  httpFileStore: HttpFileStore,
  config?: EnvironmentConfig,
  workingDir?: PathLike,
  activeEnvironment?: string[] | undefined,
}
