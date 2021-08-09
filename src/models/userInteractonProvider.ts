export interface UserInteractonProvider{
  showNote: (note: string) => Promise<boolean>;
  showInputPrompt: (message: string, defaultValue?: string) => Promise<string | undefined>,
  showListPrompt: (message: string, values: string[]) => Promise<string | undefined>,
  showWarnMessage?: (message: string) => Promise<void>,
  showErrorMessage?: (message: string) => Promise<void>,
}
