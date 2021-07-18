import { PathLike } from '../io';
import { HttpRegion } from './httpRegion';
import { Variables } from './variables';

export interface HttpFile{
  fileName: PathLike;
  httpRegions: Array<HttpRegion>;
  variablesPerEnv: Record<string, Variables>;
  activeEnvironment: string[] | undefined;
  imports?: Array<(httpFile: HttpFile) => Promise<HttpFile | false>>;
}
