import { PathLike } from '../fileProvider';
import { HttpRegion } from './httpRegion';
import { Variables } from './variables';

export interface HttpFile{
  fileName: PathLike;
  httpRegions: Array<HttpRegion>;
  variablesPerEnv: Record<string, Variables>;
  activeEnvironment: string[] | undefined;
  imports?: Array<() => Promise<HttpFile>>;
}
