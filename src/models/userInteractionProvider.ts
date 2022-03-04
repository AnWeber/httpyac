export interface UserInteractionProvider {
  isTrusted(message?: string): boolean;

  showNote: (note: string) => Promise<boolean>;
  showInputPrompt: (message: string, defaultValue?: string, maskedInput?: boolean) => Promise<string | undefined>;
  showListPrompt: (message: string, values: string[]) => Promise<string | undefined>;

  setClipboard?: (message: string) => Promise<void>;
  getClipboard?: () => Promise<string>;
  showInformationMessage?: (message: string, ...buttons: Array<string>) => Promise<string | undefined>;
  showWarnMessage?: (message: string, ...buttons: Array<string>) => Promise<string | undefined>;
  showErrorMessage?: (message: string, ...buttons: Array<string>) => Promise<string | undefined>;
}
