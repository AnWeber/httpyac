export const testSymbols = {
  ok: '✓',
  error: '✖',
};

export interface TestFunction {
  (message: string, testMethod: () => void): void;
  status(status: number): void;
  header(headerKey: string, val: string | string[] | undefined): void;
  headerContains(headerKey: string, val: string): void;
  responseBody(val: unknown): void;
  hasResponseBody(): void;
  hasNoResponseBody(): void;
}
