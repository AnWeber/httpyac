import { ProcessorContext } from '../../models';
import { executeScript } from '../../actionProcessor';
import { isString, toMultiLineArray } from '../../utils';

export async function jsVariableReplacer(text: string, _type: string, {httpRegion, httpFile, variables, progress}: ProcessorContext) {
  const variableRegex = /\{{2}([^}{2}]+)\}{2}/g;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, jsVariable] = match;
    const script = `exports.$result = (${jsVariable});`;

    let lineOffset = httpRegion.symbol.startLine;
    if (httpRegion.source) {
      const index = toMultiLineArray(httpRegion.source).findIndex(line => line.indexOf(searchValue) >= 0);
      if (index >= 0) {
        lineOffset = httpRegion.symbol.startLine + index;
      }
    }
    const value = await executeScript({
      script,
      fileName: httpFile.fileName,
      variables,
      lineOffset,
      require: {
        progress
      }
    });
    if (isString(value.$result) || typeof value.$result === 'number') {
      result = result.replace(searchValue, `${value.$result}`);
    }else if (value.$result instanceof Date) {
      result = result.replace(searchValue, `${value.$result.toISOString()}`);
    }else if (value.$result) {
      result = result.replace(searchValue, value.$result);
    }
  }
  return result;
}