import { v4 } from 'uuid';

import * as utils from '../../../utils';

export function replaceIntellijVariableRandom(variable: string): string | undefined {
  const trimmedVariable = variable.trim();
  if (['$uuid', '$random.uuid'].indexOf(trimmedVariable) >= 0) {
    return v4();
  }
  if (trimmedVariable === '$timestamp') {
    return utils.toString(Date.now());
  }
  if (trimmedVariable === '$isoTimestamp') {
    return new Date().toISOString();
  }
  if (trimmedVariable === '$randomInt') {
    return `${Math.floor(Math.random() * 1000)}`;
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
    return utils.randomEmail();
  }

  return undefined;
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
      return utils.randomText(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
    }
  }
  return undefined;
}

function randomAlphanumeric(variable: string) {
  const match = /^\$random.alphanumeric\s*\(\s*(?<length>-?\d+)\s*\)\s*$/u.exec(variable);
  if (match && match.groups?.length) {
    const length = utils.toNumber(match.groups?.length);
    if (length) {
      return utils.randomText(length);
    }
  }
  return undefined;
}

function randomHexadecimal(variable: string) {
  const match = /^\$random.hexadecimal\s*\(\s*(?<length>-?\d+)\s*\)\s*$/u.exec(variable);
  if (match && match.groups?.length) {
    const length = utils.toNumber(match.groups?.length);
    if (length) {
      return utils.randomText(length, '1234567890ABCDEF');
    }
  }
  return undefined;
}
