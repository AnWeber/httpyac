import { userInteractionProvider } from '../../../io';
import { UserSession } from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

interface PickSession extends UserSession {
  answer?: string;
}

export async function showQuickpickVariableReplacer(text: unknown): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const matchInput = /^\$pick(?<save>-askonce)?\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))\s*$/u.exec(variable);
    if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {
      const placeholder = matchInput.groups.placeholder;
      const value = matchInput.groups.value;

      const id = `input_${placeholder}`;

      const session = userSessionStore.getUserSession<PickSession>(id);

      if (session?.answer && matchInput.groups.save) {
        return session.answer;
      }

      const answer = await userInteractionProvider.showListPrompt(placeholder, value.split(','));
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
