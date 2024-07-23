import { isString } from '../../utils';

const BasicAuth = /^\s*(basic)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/iu;
const BasicAuthColon = /^\s*(basic)\s+(?<user>.*):(?<password>.*)$/iu;
export async function basicAuthVariableReplacer(text: unknown | undefined, type: string): Promise<unknown> {
  if (type.toLowerCase() === 'authorization' && isString(text)) {
    const match = BasicAuthColon.exec(text) || BasicAuth.exec(text);

    if (match && match.groups && match.groups.user) {
      return `Basic ${Buffer.from(`${match.groups.user}:${match.groups.password}`).toString('base64')}`;
    }
  }
  return text;
}
