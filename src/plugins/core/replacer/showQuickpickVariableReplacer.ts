import { userInteractionProvider, javascriptProvider, log } from '../../../io';
import { UserSession, ProcessorContext } from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

interface PickSession extends UserSession {
  answer?: string;
}

export async function showQuickpickVariableReplacer(
  text: unknown,
  _type: string,
  context: ProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const matchInput = /^\$pick(?<save>-askonce)?\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))\s*$/u.exec(variable);
    if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {
      const placeholder = matchInput.groups.placeholder.trim();
      const id = `input_${placeholder}`;

      const session = userSessionStore.getUserSession<PickSession>(id);

      if (session?.answer && matchInput.groups.save) {
        return session.answer;
      }

      const items = await getArray(matchInput.groups.value, context);
      const answer = await userInteractionProvider.showListPrompt(placeholder, items);
      if (answer) {
        userSessionStore.setUserSession({
          id,
          title: `${placeholder}=${answer}`,
          description: `Cache for $pick`,
          type: 'input',
          details: {
            placeholder,
            answer,
          },
          answer,
        });
        return answer;
      }
      return HookCancel;
    }
    return undefined;
  });
}

async function getArray(value: string, context: ProcessorContext): Promise<Array<string>> {
  const result = value.split(',');

  if (result.length === 1) {
    try {
      const jsResult = await javascriptProvider.evalExpression(value, context);
      if (Array.isArray(jsResult)) {
        return jsResult;
      }
    } catch (err) {
      log.trace(err);
    }
  }

  return result;
}
