import { HttpFileHooks } from './httpFileHooks';
import { HttpRegion } from './httpRegion';
import { PathLike } from './pathLike';

export interface HttpFile {
  fileName: PathLike;
  readonly rootDir?: PathLike;
  readonly hooks: HttpFileHooks;
  readonly httpRegions: Array<HttpRegion>;
  activeEnvironment?: string[];
}
