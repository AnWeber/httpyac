import { PathLike } from '../io';
import { HttpRegion } from './httpRegion';
import { HttpFileHooks } from './httpFileHooks';
import { Variables } from './variables';
import { EnvironmentConfig } from './environmentConfig';

export interface HttpFile{
  fileName: PathLike;
  readonly rootDir?: PathLike;
  readonly hooks: HttpFileHooks,
  readonly httpRegions: Array<HttpRegion>;
  config?: EnvironmentConfig;
  variablesPerEnv: Record<string, Variables>;
  activeEnvironment?: string[];
}
