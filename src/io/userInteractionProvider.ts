import inquirer from 'inquirer';
import { UserInteractonProvider } from '../models';


export const userInteractionProvider: UserInteractonProvider = {
  showNote: async function showNote(note: string) {
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'note',
      message: note,
    }]);
    return answer.note;
  },
  showInputPrompt: async function showInputPrompt(message: string, defaultValue?: string) {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'placeholder',
      message,
      default: defaultValue
    }]);
    return answer.placeholder;
  },
  showListPrompt: async function showListPrompt(message: string, values: string[]) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'placeholder',
      message,
      choices: values
    }]);
    return answer.placeholder;
  },
};
