import { HttpRegion, HttpFile } from '../../httpRegion';
import { ReplacerType } from './variableReplacer';

export async function hostVariableReplacer(text: string, type: ReplacerType | string, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) {
  if (ReplacerType.url === type && !!variables.host) {
    if (text.startsWith("/")) {
      return `${variables.host}${text}`;
    }
  }
  return text;
}