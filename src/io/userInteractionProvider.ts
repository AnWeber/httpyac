import { UserInteractionProvider } from '../models';

export const userInteractionProvider: UserInteractionProvider = {
  isTrusted: () => true,
  showNote: async function showNote() {
    throw new Error('Not Implemented');
  },
  showInputPrompt: async function showInputPrompt() {
    throw new Error('Not Implemented');
  },
  showListPrompt: async function showListPrompt() {
    throw new Error('Not Implemented');
  },
};
