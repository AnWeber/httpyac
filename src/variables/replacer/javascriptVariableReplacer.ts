import { ProcessorContext, VariableReplacer } from '../../models';
import { executeScript } from '../../actions';
import { isString, toMultiLineArray } from '../../utils';


export class JavascriptVariableReplacer implements VariableReplacer {
  type = 'javascript';
  async replace(text: string, _type: string, context: ProcessorContext): Promise<string | undefined> {
    const { httpRegion, httpFile, variables, progress } = context;
    const variableRegex = /\{{2}([^}{2}]+)\}{2}/gu;
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
      } else if (value.$result instanceof Date) {
        result = result.replace(searchValue, `${value.$result.toISOString()}`);
      } else if (value.$result) {
        result = result.replace(searchValue, `${value.$result}`);
      }
    }
    return result;
  }
}
