import { PathLike } from './pathLike';
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
}
