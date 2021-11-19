import { ParserRegex } from '../../parser';
import { isString } from '../../utils';
import { v4 as uuidv4 } from 'uuid';

export async function intellijVariableReplacer(text: unknown): Promise<unknown> {
  if (!isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = ParserRegex.javascript.scriptSingleLine.exec(text)) !== null) {
    const [searchValue, variable] = match;

    let replacement: unknown = null;
    switch (variable.trim()) {
      case '$uuid':
        replacement = uuidv4();
        break;
      case '$timestamp':
        replacement = Date.now();
        break;
      case '$randomInt':
        replacement = Math.floor(Math.random() * 1000);
        break;
      default:
        replacement = null;
        break;
    }
    if (replacement) {
      result = result.replace(searchValue, `${replacement}`);
    }
  }
  return result;
}
