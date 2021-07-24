import { ParserRegex } from '../../parser';

export async function basicAuthVariableReplacer(text: string | undefined, type: string): Promise<string | undefined> {
  if (type.toLowerCase() === 'authorization' && text) {
    const match = ParserRegex.auth.basic.exec(text);

    if (match && match.groups && match.groups.user && match.groups.password) {
      return `Basic ${Buffer.from(`${match.groups.user}:${match.groups.password}`).toString('base64')}`;
    }
  }
  return text;
}
