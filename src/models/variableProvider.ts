import { HttpFile } from './httpFile';

export type VariableProvider = (env: string[] | undefined, httpFile: HttpFile) => Promise<Record<string, any>>;
