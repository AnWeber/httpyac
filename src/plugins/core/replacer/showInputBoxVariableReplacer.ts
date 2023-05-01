import { userInteractionProvider } from '../../../io';
import { UserSession } from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';
import { HookCancel } from 'hookpoint';

interface InputSession extends UserSession {
  answer?: string;
}

export async function showInputBoxVariableReplacer(text: unknown): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const inputRegex =
      /^\$(?<type>(prompt|input|password))(?<save>-askonce)?\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))?\s*$/u;
    const matchInput = inputRegex.exec(variable);

    if (matchInput?.groups?.placeholder) {
      const placeholder = matchInput.groups.placeholder.trim();
      const inputType = matchInput.groups.type;

      const id = `input_${placeholder}`;

      const session = userSessionStore.getUserSession<InputSession>(id);

      if (session?.answer && matchInput.groups.save) {
        return session.answer;
      }

      const answer = await userInteractionProvider.showInputPrompt(
        placeholder,
        session?.answer || matchInput.groups.value,
        inputType === 'password'
      );
      if (answer) {
        userSessionStore.setUserSession({
          id,
          title: `${placeholder}=${answer}`,
          description: `Cache for ${inputType}`,
          type: 'input',
          details: {
            placeholder,
            inputType,
            answer: inputType !== 'password' ? answer : undefined,
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
