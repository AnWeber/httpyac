import { PathLike } from '../io';
import { HttpRegion } from './httpRegion';
import { VariableProvider } from './variableProvider';
import { VariableReplacer } from './variableReplacer';
import { Variables } from './variables';

export interface HttpFile{
  fileName: PathLike;
  rootDir?: PathLike;
  variableReplacers: Array<VariableReplacer>,
  variableProviders: Array<VariableProvider>,
  httpRegions: Array<HttpRegion>;
  variablesPerEnv: Record<string, Variables>;
  activeEnvironment?: string[];
  imports?: Array<(httpFile: HttpFile) => Promise<HttpFile | false>>;
}
