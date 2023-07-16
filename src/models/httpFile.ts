import { HttpFileHooks } from './hooks';
import { HttpRegion } from './httpRegion';
import { PathLike } from './pathLike';

export interface HttpFile {
  fileName: PathLike;
  readonly rootDir?: PathLike;
  readonly hooks: HttpFileHooks;
  readonly httpRegions: Array<HttpRegion>;
  readonly globalHttpRegions: Array<HttpRegion>;
  activeEnvironment?: string[];

  findHttpRegion(name: string): HttpRegion | undefined;
}
