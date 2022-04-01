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

    const match = /^\s*@(?<key>[^\s=:]*)\s*(?<operator>:?)=*\s*"?(?<value>.*)"?\s*$/u.exec(textLine);

    if (match && match.groups && match.groups.key && match.groups.value) {
      const key = match.groups.key;
      const replaceValue = !!match.groups.operator;
      const value = match.groups.value;
      httpRegion.hooks.execute.addHook('variable', async context => {
        let result: unknown = value;
        if (replaceValue) {
          result = await utils.replaceVariables(value, models.VariableType.variable, context);
        } else {
          context.options.replaceVariables = true;
        }
        utils.setVariableInContext(
          {
            [key]: result,
          },
          context
        );
        return true;
      });

      return {
        nextParserLine: next.value.line,
        symbols: [
          {
            name: match.groups.key,
            description: match.groups.value,
            kind: models.HttpSymbolKind.variable,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
            children: [
              {
                name: match.groups.key,
                description: 'key',
                kind: models.HttpSymbolKind.key,
                startLine: next.value.line,
                startOffset: next.value.textLine.indexOf(match.groups.key),
                endLine: next.value.line,
                endOffset: next.value.textLine.indexOf(match.groups.key) + match.groups.key.length,
              },
              {
                name: match.groups.value,
                description: 'value',
                kind: models.HttpSymbolKind.value,
                startLine: next.value.line,
                startOffset: next.value.textLine.indexOf(match.groups.value),
                endLine: next.value.line,
                endOffset: next.value.textLine.indexOf(match.groups.value) + match.groups.value.length,
              },
            ],
          },
        ],
      };
    }
  }
  return false;
}
