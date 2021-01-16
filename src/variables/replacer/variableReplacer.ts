import { HttpRegion, HttpFile } from '../../httpRegion';

export enum ReplacerType{
  variable ="Variable",
  url = "Url",
  body = "Body",
}

export type VariableReplacer = (text: string, type: ReplacerType | string, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) => Promise<string>;