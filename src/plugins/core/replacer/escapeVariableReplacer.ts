import * as models from '../../../models';
import { isString } from '../../../utils';
import { HookTriggerContext } from 'hookpoint';

export const escapeVariableInterceptor = {
  afterTrigger: async function escapeVariable(
    hookContext: HookTriggerContext<[unknown, string, models.ProcessorContext], boolean>
  ): Promise<boolean> {
    const [text, ...spread] = hookContext.args;
    if (isString(text)) {
      const escapeRegex = /(?:\\\{){2}([^}{2}]+)(?:\\\}){2}/gu;
      let match: RegExpExecArray | null;
      let result = text;
      while (isString(result) && (match = escapeRegex.exec(text)) !== null) {
        const [searchValue, variable] = match;
        result = result.replace(searchValue, `{{${variable}}}`);
      }
      hookContext.args = [result, ...spread];
    }
    return true;
  },
};
