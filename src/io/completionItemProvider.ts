import * as models from '../models';

export type CompletionItem = {
  name: string;
  description: string;
  text?: string;
};

export const completionItemProvider: {
  emptyLineProvider: Array<(text: string) => Array<CompletionItem>>;
  requestHeaderProvider: Array<(request: models.Request) => Array<CompletionItem>>;
} = {
  emptyLineProvider: [],
  requestHeaderProvider: [],
};
