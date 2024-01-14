import * as models from '../../models';
import * as utils from '../../utils';
import { XPathProcessorContext } from './xpathProcessorContext';

export async function parseXpathNamespace(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;

    const match = /^\s*@xpath_ns\s+(?<key>[^\s=:]*)\s*=\s*"?(?<value>.*)"?\s*$/u.exec(textLine);

    if (match && match.groups && match.groups.key && match.groups.value) {
      const key = match.groups.key;
      const value = match.groups.value;
      httpRegion.hooks.execute.addHook(`xpath_ns_${key}`, async (context: XPathProcessorContext) => {
        if (!context.options.xpath_namespaces) {
          context.options.xpath_namespaces = {};
        }
        const namespace = await utils.replaceVariables(value, models.VariableType.variable, context);
        if (utils.isString(namespace)) {
          context.options.xpath_namespaces[key] = namespace;
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
