import { ParserRegex } from '../../parser';
import { isString } from '../../utils';

export async function basicAuthVariableReplacer(text: unknown | undefined, type: string): Promise<unknown> {
  if (type.toLowerCase() === 'authorization' && isString(text)) {
    const match = ParserRegex.auth.basicColon.exec(text) || ParserRegex.auth.basic.exec(text);

    if (match && match.groups && match.groups.user && match.groups.password) {
      return `Basic ${Buffer.from(`${match.groups.user}:${match.groups.password}`).toString('base64')}`;
    }
  }
  return text;
}
