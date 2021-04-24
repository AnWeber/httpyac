import { VariableReplacer, VariableReplacerType } from '../../models';

export class BasicAuthVariableReplacer implements VariableReplacer {
  type = VariableReplacerType.basicAuth;
  async replace(text: string, type: string): Promise<string | undefined> {
    if (type.toLowerCase() === 'authorization' && text) {
      const match = /^\s*(basic)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/iu.exec(text);

      if (match && match.groups && match.groups.user && match.groups.password) {
        return `Basic ${Buffer.from(`${match.groups.user}:${match.groups.password}`).toString('base64')}`;
      }
    }
    return text;
  }
}
