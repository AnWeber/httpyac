import { HookCancel } from 'hookpoint';

import { userInteractionProvider } from '../../../io';
import { ProcessorContext, UserSession } from '../../../models';
import { userSessionStore } from '../../../store';
import * as utils from '../../../utils';

interface InputSession extends UserSession {
  answer?: string;
}

export async function showInputBoxVariableReplacer(
  text: unknown,
  _type: string,
  { variables }: ProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const inputRegex =
      /^\$(?<type>(prompt|input|password))(?<askonce>-askonce)?\s*(?<placeholder>[^$]*)(\$value:\s*(?<value>.*))?\s*$/u;
    const matchInput = inputRegex.exec(variable);

    if (matchInput?.groups?.placeholder) {
      const placeholder = matchInput.groups.placeholder.trim();
      const inputType = matchInput.groups.type;

      const id = `input_${placeholder}`;

      const session = userSessionStore.getUserSession<InputSession>(id);

      if (matchInput.groups.askonce) {
        if (variables?.[placeholder] !== undefined) {
          return variables[placeholder];
        }
        if (session?.answer) {
          return session.answer;
        }
      }

      const isPassword = inputType === 'password';
      const answer = await userInteractionProvider.showInputPrompt(
        placeholder,
        session?.answer || matchInput.groups.value,
        isPassword
      );
      if (answer !== undefined) {
        userSessionStore.setUserSession({
          id,
          title: isPassword ? placeholder : `${placeholder}=${answer}`,
          description: `Cache for ${inputType}`,
          type: 'input',
          details: {
            placeholder,
            inputType,
            answer: isPassword ? undefined : answer,
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
