import { ProcessorContext, VariableType } from '../../models';
import { ParserRegex } from '../../parser';
import { isString } from '../../utils';
import dayjs, { OpUnitType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';

dayjs.extend(utc);

export async function restClientVariableReplacer(
  text: unknown,
  _type: VariableType | string,
  { variables }: ProcessorContext
): Promise<unknown> {
  if (!isString(text)) {
    return text;
  }
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = ParserRegex.javascript.scriptSingleLine.exec(text)) !== null) {
    const [searchValue, variable] = match;

    const trimmedVariable = variable.trim();
    let replacement: unknown = null;
    if (trimmedVariable === '$guid') {
      replacement = uuidv4();
    } else if (trimmedVariable.startsWith('$randomInt')) {
      const valMatch = /^\$randomInt\s*(?<min>-?\d+)?\s*(?<max>-?\d+)?\s*$/u.exec(trimmedVariable);
      if (valMatch && valMatch.groups?.min && valMatch.groups?.max) {
        let min = Number(valMatch.groups?.min);
        let max = Number(valMatch.groups?.max);

        if (!Number.isNaN(min) && !Number.isNaN(max)) {
          if (min > max) {
            const temp = max;
            max = min;
            min = temp;
          }
          replacement = `${Math.floor(Math.random() * (max - min)) + min}`;
        }
      }
    } else if (trimmedVariable.startsWith('$timestamp')) {
      const valMatch = /^\$timestamp(?:\s(?<offset>-?\d+)\s(?<option>y|Q|M|w|d|h|m|s|ms))?/u.exec(trimmedVariable);
      if (valMatch) {
        dayjs.extend(utc);

        let date = dayjs.utc();
        if (valMatch.groups?.offset && valMatch.groups?.option) {
          date = date.add(Number(valMatch.groups.offset), valMatch.groups.option as OpUnitType);
        }
        replacement = `${date.unix()}`;
      }
    } else if (trimmedVariable.startsWith('$datetime')) {
      const valMatch =
        /^\$datetime\s(?<type>rfc1123|iso8601|'.+'|".+")(?:\s(?<offset>-?\d+)\s(?<option>y|Q|M|w|d|h|m|s|ms))?/u.exec(
          trimmedVariable
        );
      if (valMatch?.groups?.type) {
        let date = dayjs.utc();
        if (valMatch.groups?.offset && valMatch.groups?.option) {
          date = date.add(Number(valMatch.groups.offset), valMatch.groups.option as OpUnitType);
        }

        if (valMatch.groups.type === 'rfc1123') {
          replacement = date.toDate().toUTCString();
        } else if (valMatch.groups.type === 'iso8601') {
          replacement = date.toISOString();
        } else {
          replacement = date.format(valMatch.groups.type.slice(1, valMatch.groups.type.length - 1));
        }
      }
    } else if (trimmedVariable.startsWith('$localDatetime')) {
      const valMatch =
        /^\$localDatetime\s(?<type>rfc1123|iso8601|'.+'|".+")(?:\s(?<offset>-?\d+)\s(?<option>y|Q|M|w|d|h|m|s|ms))?/u.exec(
          trimmedVariable
        );
      if (valMatch?.groups?.type) {
        let date = dayjs.utc().local();
        if (valMatch.groups?.offset && valMatch.groups?.option) {
          date = date.add(Number(valMatch.groups.offset), valMatch.groups.option as OpUnitType);
        }

        if (valMatch.groups.type === 'rfc1123') {
          replacement = date.locale('en').format('ddd, DD MMM YYYY HH:mm:ss ZZ');
        } else if (valMatch.groups.type === 'iso8601') {
          replacement = date.format();
        } else {
          replacement = date.format(valMatch.groups.type.slice(1, valMatch.groups.type.length - 1));
        }
      }
    } else if (trimmedVariable.startsWith('$processEnv')) {
      replacement = process.env[trimmedVariable.slice('$processEnv'.length).trim()];
    } else if (trimmedVariable.startsWith('$dotenv')) {
      replacement = variables[trimmedVariable.slice('$dotenv'.length).trim()];
    }

    if (replacement) {
      result = result.replace(searchValue, `${replacement}`);
    }
  }
  return result;
}
