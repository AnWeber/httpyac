import { ProcessorContext, VariableType } from '../../../models';
import * as utils from '../../../utils';

export async function hostVariableReplacer(
  text: unknown,
  type: VariableType | string,
  { variables, request }: ProcessorContext
): Promise<unknown> {
  if (utils.isString(text) && VariableType.url === type) {
    if (text.startsWith('/')) {
      if (variables.host) {
        return `${variables.host}${text}`;
      }
      const host = utils.getHeader(request?.headers, 'Host');
      if (utils.isString(host)) {
        const [, port] = host.toString().split(':');
        const scheme = port === '443' || port === '8443' ? 'https' : 'http';
        return `${scheme}://${host}${text}`;
      }
    }
  }
  return text;
}
