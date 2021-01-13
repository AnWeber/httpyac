import { HttpFile } from '../../httpRegion';

export type VariableProvider = (httpFile: HttpFile) => Promise<Record<string, any>>;
