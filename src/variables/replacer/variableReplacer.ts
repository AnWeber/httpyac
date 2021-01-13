import { HttpRegion, HttpFile } from '../../httpRegion';


export type VariableReplacer = (text: string, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) => Promise<string>;