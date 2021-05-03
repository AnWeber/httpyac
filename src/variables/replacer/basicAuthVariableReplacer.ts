import { VariableReplacer, VariableReplacerType } from '../../models';
import { ParserRegex } from '../../parser';

export class BasicAuthVariableReplacer implements VariableReplacer {
  type = VariableReplacerType.basicAuth;
  async replace(text: string, type: string): Promise<string | undefined> {
    if (type.toLowerCase() === 'authorization' && text) {
      const match = ParserRegex.auth.basic.exec(text);

      if (match && match.groups && match.groups.user && match.groups.password) {
        return `Basic ${Buffer.from(`${match.groups.user}:${match.groups.password}`).toString('base64')}`;
      }
    }
    return text;
  }
}
