import * as models from '../../../models';
import * as utils from '../../../utils';

export async function parseVariable(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;

    const match = /^\s*@(?<useGlobal>global\.)?(?<key>[^\s=:]*)\s*(?<lazyIndicator>:?)=*\s*"?(?<value>.*)"?\s*$/u.exec(
      textLine
    );

    if (match && match.groups && match.groups.key && match.groups.value) {
      const key = match.groups.key;
      const isLazy = !!match.groups.lazyIndicator;
      const useGlobal = !!match.groups.useGlobal;
      const value = match.groups.value;
      httpRegion.hooks.execute.addHook(`variable_${key}`, async context => {
        let result: unknown = value;
        if (isLazy) {
          context.options.lazyVariables = true;
        } else {
          result = await utils.replaceVariables(value, models.VariableType.variable, context);
        }
        const globalVar = context.variables.$global;
        if (useGlobal && globalVar && typeof globalVar === 'object') {
          Object.assign(globalVar, { [key]: result });
        } else {
          utils.setVariableInContext(
            {
              [key]: result,
            },
            context
          );
        }
        return true;
      });

      return {
        nextParserLine: next.value.line,
        symbols: [
          new models.HttpSymbol({
            name: match.groups.key,
            description: match.groups.value,
            kind: models.HttpSymbolKind.variableDefinition,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
            children: [
              new models.HttpSymbol({
                name: match.groups.key,
                description: 'key',
                kind: models.HttpSymbolKind.key,
                startLine: next.value.line,
                startOffset: next.value.textLine.indexOf(match.groups.key),
                endLine: next.value.line,
                endOffset: next.value.textLine.indexOf(match.groups.key) + match.groups.key.length,
              }),
              new models.HttpSymbol({
                name: match.groups.value,
                description: 'value',
                kind: models.HttpSymbolKind.value,
                startLine: next.value.line,
                startOffset: next.value.textLine.indexOf(match.groups.value),
                endLine: next.value.line,
                endOffset: next.value.textLine.indexOf(match.groups.value) + match.groups.value.length,
              }),
            ],
          }),
        ],
      };
    }
  }
  return false;
}
