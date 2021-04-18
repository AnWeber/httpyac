import { HttpFile } from './httpFile';
import { Variables } from './variables';

export interface VariableProvider {
  reset?(): void;
  getEnvironments?(httpFile: HttpFile): Promise<string[]>;
  getVariables(env: string[] | undefined, httpFile: HttpFile): Promise<Variables>;
}
