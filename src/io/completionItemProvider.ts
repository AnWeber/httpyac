import * as models from '../models';

export type CompletionItem = {
  name: string;
  description: string;
  text?: string;
};

export const completionItemProvider: {
  emptyLineProvider: Array<() => Array<CompletionItem>>;
  variableProvider: Array<() => Array<CompletionItem>>;
  requestHeaderProvider: Array<(request: models.Request) => Array<CompletionItem>>;
} = {
  emptyLineProvider: [],
  variableProvider: [],
  requestHeaderProvider: [],
};
