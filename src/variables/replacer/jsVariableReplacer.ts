import { EOL } from 'os';
import { executeScript } from '../../actionProcessor';
import { HttpRegion, HttpFile } from '../../httpRegion';

export async function jsVariableReplacer(text: string, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string,any>) {
  const variableRegex = /\{{2}(.+?)\}{2}/g;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, jsVariable] = match;
    const script = `exports.$result = (${jsVariable});`;

    let lineOffset = httpRegion.symbol.startLine;
    if (httpRegion.source) {
      const index = httpRegion.source.split(EOL).findIndex(line => line.indexOf(searchValue) >= 0);
      if (index >= 0) {
        lineOffset = httpRegion.symbol.startLine + index;
      }
    }
    const value = await executeScript(script, httpFile.fileName, variables, lineOffset);
    if (value.$result) {
      result = result.replace(match[0], `${value.$result}`);
    }
  }
  return result;
}