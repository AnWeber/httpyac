import { isString } from '../../../utils';

export async function escapeVariableReplacer(text: unknown): Promise<unknown> {
  if (isString(text)) {
    const escapeRegex = /(?:\\\{){2}([^}{2}]+)(?:\\\}){2}/gu;
    let match: RegExpExecArray | null;
    let result = text;
    while (isString(result) && (match = escapeRegex.exec(text)) !== null) {
      const [searchValue, variable] = match;
      result = result.replace(searchValue, `{{${variable}}}`);
    }
    return result;
  }
  return text;
}
