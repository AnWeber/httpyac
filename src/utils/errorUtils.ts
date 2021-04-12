
export interface ErrorDescription{
  error?: string;
  message?: string;
  file?: string;
  line?: string;
  offset?: string;
}

export function parseError(err: Error) : false| ErrorDescription{
  if (err.stack) {
    const match = /^(?<error>.*):\s*(?<message>.*)\r?\n\s*at (?<file>.*):(?<line>\d*):(?<offset>\d*)/m.exec(err.stack);

    if (match && match.groups?.error) {
      return {
        error:  match.groups.error,
        message: match.groups.message,
        file: match.groups.file,
        line: match.groups.line,
        offset: match.groups.offset,
      };
    }
  }
  return false;
}