import * as models from '../models';
import { ParserRegex } from './parserRegex';
import * as utils from '../utils';
import { log, userInteractionProvider } from '../io';

export async function parseVariable(getLineReader: models.getHttpLineGenerator, { httpRegion }: models.ParserContext): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();

  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;

    const match = ParserRegex.variable.exec(textLine);

    if (match && match.groups && match.groups.key && match.groups.value) {
      httpRegion.hooks.execute.addObjHook(obj => obj.process, new VariableAction({
        [match.groups.key]: match.groups.value.trim(),
      }));
      return {
        nextParserLine: next.value.line,
        symbols: [{
          name: match.groups.key,
          description: match.groups.value,
          kind: models.HttpSymbolKind.variable,
          startLine: next.value.line,
          startOffset: 0,
          endLine: next.value.line,
          endOffset: next.value.textLine.length,
          children: [{
            name: match.groups.key,
            description: 'key',
            kind: models.HttpSymbolKind.key,
            startLine: next.value.line,
            startOffset: next.value.textLine.indexOf(match.groups.key),
            endLine: next.value.line,
            endOffset: next.value.textLine.indexOf(match.groups.key) + match.groups.key.length,
          }, {
            name: match.groups.value,
            description: 'value',
            kind: models.HttpSymbolKind.value,
            startLine: next.value.line,
            startOffset: next.value.textLine.indexOf(match.groups.value),
            endLine: next.value.line,
            endOffset: next.value.textLine.indexOf(match.groups.value) + match.groups.value.length,
          }]
        }],
      };
    }
  }
  return false;
}


class VariableAction {
  id = models.ActionType.variable;

  constructor(private readonly data: Record<string, string>) { }

  async process(context: models.ProcessorContext): Promise<boolean> {
    if (this.data) {
      for (const [key, value] of Object.entries(this.data)) {
        if (utils.isValidVariableName(key)) {
          const result = await utils.replaceVariables(value, models.VariableType.variable, context);
          if (result === models.HookCancel) {
            return false;
          }
          utils.setVariableInContext({ [key]: result }, context);
        } else {
          const message = `Javascript Keyword ${key} not allowed as variable`;
          userInteractionProvider.showWarnMessage?.(message);
          log.warn(message);
        }
      }
    }
    return true;
  }
}
