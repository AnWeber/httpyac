import { HttpRegion } from './httpRegion';
import { Variables } from './variables';

export interface HttpFile{
  fileName: string;
  httpRegions: Array<HttpRegion>;
  variablesPerEnv: Record<string, Variables>;
  activeEnvironment: string[] | undefined;
  imports?: Array<() => Promise<HttpFile>>;
}
