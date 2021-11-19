export interface ErrorDescription {
  error: Error;
  displayMessage: string;
  errorType?: string;
  message?: string;
  file?: string;
  line?: string;
  offset?: string;
}

export interface TestResult {
  message: string;
  result: boolean;
  error?: ErrorDescription;
}
