import * as utils from '../../utils';
import { v4 } from 'uuid';

export async function replaceDynamicIntellijVariables(text: unknown): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const trimmedVariable = variable.trim();
    if (['$uuid', '$random.uuid'].indexOf(trimmedVariable) >= 0) {
      return v4();
    }
    if (trimmedVariable === '$timestamp') {
      return Date.now();
    }
    if (trimmedVariable === '$isoTimestamp') {
      return new Date().toISOString();
    }
    if (trimmedVariable === '$randomInt') {
      return Math.floor(Math.random() * 1000);
    }
    if (trimmedVariable.startsWith('$random.integer')) {
      const float = randomFloat(trimmedVariable);
      if (float) {
        return `${Math.floor(float)}`;
      }
    }
    if (trimmedVariable.startsWith('$random.float')) {
      const float = randomFloat(trimmedVariable);
      if (float) {
        return `${float}`;
      }
    }
    if (trimmedVariable.startsWith('$random.alphabetic')) {
      return randomAlphabetic(trimmedVariable);
    }
    if (trimmedVariable.startsWith('$random.alphanumeric')) {
      return randomAlphanumeric(trimmedVariable);
    }
    if (trimmedVariable.startsWith('$random.hexadecimal')) {
      return randomHexadecimal(trimmedVariable);
    }

    if (trimmedVariable.startsWith('$random.email')) {
      return `${randomText(30)}@${randomText(10)}.${randomArrayValue([
        'com',
        'org',
        'at',
        'de',
        'fr',
        'uk',
        'it',
        'ch',
        'info',
        'edu',
        'asia',
        'gov',
        'app',
        'io',
      ])}`;
    }

    return undefined;
  });
}

function randomFloat(variable: string) {
  const match = /^\$random.(integer|float)\s*\(\s*(?<from>-?\d+)\s*,\s*(?<to>-?\d+)\s*\)$/u.exec(variable);
  if (match && match.groups?.from && match.groups?.to) {
    let from = utils.toNumber(match.groups?.from) || 0;
    let to = utils.toNumber(match.groups?.to) || 0;
    if (!Number.isNaN(from) && !Number.isNaN(to)) {
      if (from > to) {
        const temp = to;
        to = from;
        from = temp;
      }
      return Math.random() * (to - from) + from;
    }
  }
  return undefined;
}

function randomAlphabetic(variable: string) {
  const match = /^\$random.alphabetic\s*\(\s*(?<length>-?\d+)\s*\)\s*$/u.exec(variable);
  if (match && match.groups?.length) {
    const length = utils.toNumber(match.groups?.length);
    if (length) {
      return randomText(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
    }
  }
  return undefined;
}

function randomAlphanumeric(variable: string) {
  const match = /^\$random.alphanumeric\s*\(\s*(?<length>-?\d+)\s*\)\s*$/u.exec(variable);
  if (match && match.groups?.length) {
    const length = utils.toNumber(match.groups?.length);
    if (length) {
      return randomText(length);
    }
  }
  return undefined;
}

function randomHexadecimal(variable: string) {
  const match = /^\$random.hexadecimal\s*\(\s*(?<length>-?\d+)\s*\)\s*$/u.exec(variable);
  if (match && match.groups?.length) {
    const length = utils.toNumber(match.groups?.length);
    if (length) {
      return randomText(length, '1234567890ABCDEF');
    }
  }
  return undefined;
}

function randomText(length: number, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_') {
  const result = [];

  if (length > 0) {
    const abc = chars.split('');
    for (let index = 0; index < length; index++) {
      result.push(randomArrayValue(abc));
    }
  }

  return result.join('');
}

function randomArrayValue(values: Array<unknown>) {
  return values[Math.floor(Math.random() * (values.length - 1))];
}
