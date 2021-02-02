import { HttpFile } from './httpFile';

export interface VariableProvider {
  reset?(): void;
  getEnvironments?(httpFile: HttpFile): Promise<string[]>;
  getVariables(env: string[] | undefined, httpFile: HttpFile): Promise<Record<string, any>>;
}
