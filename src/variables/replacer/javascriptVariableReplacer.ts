import { ProcessorContext } from '../../models';
import { isString, toMultiLineArray, runScript } from '../../utils';


export async function javascriptVariableReplacer(text: string, _type: string, context: ProcessorContext): Promise<string | undefined> {
  const { httpRegion } = context;
  const variableRegex = /\{{2}([^}{2}]+)\}{2}/gu;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, jsVariable] = match;
    const script = `exports.$result = (${jsVariable});`;

    let lineOffset = httpRegion.symbol.startLine - 1;
    if (httpRegion.symbol.source) {
      const index = toMultiLineArray(httpRegion.symbol.source).findIndex(line => line.indexOf(searchValue) >= 0);
      if (index >= 0) {
        lineOffset += index;
      }
    }
    const value = await runScript(script, {
      fileName: context.httpFile.fileName,
      context: {
        httpFile: context.httpFile,
        httpRegion: context.httpRegion,
        console: context.scriptConsole,
        ...context.variables
      },
      lineOffset,
      require: context.require,
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
