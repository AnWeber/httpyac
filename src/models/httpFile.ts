import { PathLike } from './pathLike';
import { HttpRegion } from './httpRegion';
import { HttpFileHooks } from './httpFileHooks';

export interface HttpFile{
  fileName: PathLike;
  readonly rootDir?: PathLike;
  readonly hooks: HttpFileHooks,
  readonly httpRegions: Array<HttpRegion>;
  activeEnvironment?: string[];
}
