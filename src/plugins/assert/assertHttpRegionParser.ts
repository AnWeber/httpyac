import * as models from '../../models';
import * as utils from '../../utils';
import * as p from './predicates';
import { ok } from 'assert';

export const predicates: Array<p.TestPredicate> = [
  new p.EndsWithPredicate(),
  new p.EqualsPredicate(),
  new p.ExistsPredicate(),
  new p.GreaterEqualsPredicate(),
  new p.GreaterPredicate(),
  new p.IncludesPredicate(),
  new p.IsArrayPredicate(),
  new p.IsBooleanPredicate(),
  new p.IsNumberPredicate(),
  new p.IsStringPredicate(),
  new p.LowerEqualsPredicate(),
  new p.LowerPredicate(),
  new p.MatchesPredicate(),
  new p.NotEqualsPredicate(),
  new p.StartsWithPredicate(),
  new p.SHA256Predicate(),
  new p.MD5Predicate(),
  new p.SHA512Predicate(),
  new p.IsFalsePredicate(),
];

export async function parseAssertLine(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done && next.value.textLine) {
    const textLine = next.value.textLine;

    const idRegex = predicates
      .reduce((prev, curr) => {
        prev.push(...curr.id);
        return prev;
      }, [] as Array<string>)
      .join('|');
    const regex = `^\\s*\\?\\?\\s*(?<type>[^\\s]*)(\\s+(?<value>.*))?\\s+(?<predicate>(${idRegex}))\\s*(?<expected>.*)\\s*$`;
    const match = new RegExp(regex, 'iu').exec(textLine);

    if (match && match.groups && !!match.groups.type && match.groups.predicate) {
      const type = match.groups.type;
      const valueString = match.groups.value;
      const expectedString = match.groups.expected;
      const predicate = predicates.find(obj => match.groups?.predicate && obj.id.indexOf(match.groups.predicate) >= 0);
      if (predicate) {
        httpRegion.hooks.onResponse.addHook(`test ${textLine}`, async (response, context) => {
          const value = await context.httpFile.hooks.provideAssertValue.trigger(type, valueString, response, context);
          const expected =
            expectedString && (await utils.replaceVariables(expectedString, models.VariableType.variable, context));

          const expectedConverted = predicate.noAutoConvert ? expected : convertToType(value, expected);
          const test = utils.testFactory(context);
          test(`${valueString || type} ${predicate.id[0]} ${utils.toString(expected) || ''}`.trim(), () => {
            ok(
              predicate.match(value, expectedConverted),
              `${valueString || type} (${value}) ${predicate.id[0]} ${utils.toString(expectedConverted) || ''}`.trim()
            );
          });
        });
      }

      return {
        nextParserLine: next.value.line,
        symbols: [
          {
            name: match.groups.key,
            description: match.groups.value,
            kind: models.HttpSymbolKind.script,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
          },
        ],
      };
    }
  }
  return false;
}

function convertToType(target: unknown, value: unknown) {
  if (value !== undefined && value !== null) {
    if (typeof target === 'number') {
      return utils.toNumber(value);
    }
    if (typeof target === 'boolean') {
      return utils.toBoolean(value, !!value);
    }
    if (typeof target === 'string') {
      return utils.toString(value);
    }
    if (typeof target === 'object' && typeof value === 'string') {
      return JSON.parse(value);
    }
    if (target === null && value === 'null') {
      return null;
    }
    if (target === undefined && value === 'undefined') {
      return undefined;
    }
  }
  return value;
}
