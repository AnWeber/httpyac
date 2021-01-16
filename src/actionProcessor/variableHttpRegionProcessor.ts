import { HttpRegion , HttpFile} from '../httpRegion';
import { ReplacerType } from '../variables/replacer';
import { replaceVariables } from './httpClientActionProcessor';

export async function variableHttpRegionProcessor(data: Record<string, string>, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) {
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      variables[key] = await replaceVariables(value, ReplacerType.variable, httpRegion, httpFile, variables);
    }
  }
}
