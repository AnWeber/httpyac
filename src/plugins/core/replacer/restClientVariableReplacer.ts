import dayjs, { ManipulateType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuid } from 'uuid';

import { ProcessorContext, VariableType } from '../../../models';
import * as utils from '../../../utils';

dayjs.extend(utc);

export async function restClientVariableReplacer(
  text: unknown,
  _type: VariableType | string,
  { variables }: ProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const trimmedVariable = variable.trim();
    if (trimmedVariable === '$guid') {
      return uuid();
    }
    if (trimmedVariable.startsWith('$randomInt')) {
      const valMatch = /^\$randomInt\s*(?<min>-?\d+)?\s*(?<max>-?\d+)?\s*$/u.exec(trimmedVariable);
      if (valMatch && valMatch.groups?.min && valMatch.groups?.max) {
        let min = utils.toNumber(valMatch.groups?.min) ?? 0;
        let max = utils.toNumber(valMatch.groups?.max) ?? 100;
        if (!Number.isNaN(min) && !Number.isNaN(max)) {
          if (min > max) {
            const temp = max;
            max = min;
            min = temp;
          }
          return `${Math.floor(Math.random() * (max - min)) + min}`;
        }
      }
    } else if (trimmedVariable.startsWith('$timestamp')) {
      const valMatch = /^\$timestamp(?:\s(?<offset>-?\d+)\s(?<option>y|Q|M|w|d|h|m|s|ms))?/u.exec(trimmedVariable);
      if (valMatch) {
        dayjs.extend(utc);

        let date = dayjs.utc();
        if (valMatch.groups?.offset && valMatch.groups?.option) {
          date = date.add(Number(valMatch.groups.offset), valMatch.groups.option as ManipulateType);
        }
        return `${date.unix()}`;
      }
    } else if (trimmedVariable.startsWith('$datetime')) {
      const valMatch =
        /^\$datetime\s(?<type>rfc1123|iso8601|'.+'|".+")(?:\s(?<offset>-?\d+)\s(?<option>y|Q|M|w|d|h|m|s|ms))?/u.exec(
          trimmedVariable
        );
      if (valMatch?.groups?.type) {
        let date = dayjs.utc();
        if (valMatch.groups?.offset && valMatch.groups?.option) {
          date = date.add(Number(valMatch.groups.offset), valMatch.groups.option as ManipulateType);
        }

        if (valMatch.groups.type === 'rfc1123') {
          return date.toDate().toUTCString();
        }
        if (valMatch.groups.type === 'iso8601') {
          return date.toISOString();
        }
        return date.format(valMatch.groups.type.slice(1, valMatch.groups.type.length - 1));
      }
    } else if (trimmedVariable.startsWith('$localDatetime')) {
      const valMatch =
        /^\$localDatetime\s(?<type>rfc1123|iso8601|'.+'|".+")(?:\s(?<offset>-?\d+)\s(?<option>y|Q|M|w|d|h|m|s|ms))?/u.exec(
          trimmedVariable
        );
      if (valMatch?.groups?.type) {
        let date = dayjs.utc().local();
        if (valMatch.groups?.offset && valMatch.groups?.option) {
          date = date.add(Number(valMatch.groups.offset), valMatch.groups.option as ManipulateType);
        }

        if (valMatch.groups.type === 'rfc1123') {
          return date.locale('en').format('ddd, DD MMM YYYY HH:mm:ss ZZ');
        }
        if (valMatch.groups.type === 'iso8601') {
          return date.format();
        }
        return date.format(valMatch.groups.type.slice(1, valMatch.groups.type.length - 1));
      }
    } else if (trimmedVariable.startsWith('$processEnv')) {
      return process.env[trimmedVariable.slice('$processEnv'.length).trim()] || '';
    } else if (trimmedVariable.startsWith('$dotenv')) {
      return variables[trimmedVariable.slice('$dotenv'.length).trim()] || '';
    }
    return undefined;
  });
}
