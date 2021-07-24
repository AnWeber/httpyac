import { PathLike } from '../io';
import { HttpRegion } from './httpRegion';
import { HttpFileHooks } from './httpFileHooks';
import { Variables } from './variables';

export interface HttpFile{
  fileName: PathLike;
  readonly rootDir?: PathLike;
  readonly hooks: HttpFileHooks,
  readonly httpRegions: Array<HttpRegion>;
  variablesPerEnv: Record<string, Variables>;
  activeEnvironment?: string[];
  imports?: Array<(httpFile: HttpFile) => Promise<HttpFile | false>>;
}
