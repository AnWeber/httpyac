import { default as dayjs } from 'dayjs';
import { v4 } from 'uuid';

export const randomData = {
  alphabetic: (length = 10) => randomText(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'),
  numeric: (length = 10) => randomText(length),
  hexadecimal: (length = 10) => randomText(length, '1234567890ABCDEF'),
  email: randomEmail,
  float: (from = 0, to = 100) => Math.random() * (to - from) + from,
  integer: (from = 0, to = 100) => Math.floor(Math.random() * (to - from) + from),
  uuid: () => v4(),
  date: (date: Date = new Date(), format: string | undefined = undefined) => dayjs(date).format(format),
};

export function randomEmail() {
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

export function randomText(length: number, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_') {
  const result = [];

  if (length > 0) {
    const abc = chars.split('');
    for (let index = 0; index < length; index++) {
      result.push(randomArrayValue(abc));
    }
  }

  return result.join('');
}

export function randomArrayValue(values: Array<unknown>) {
  return values[Math.floor(Math.random() * (values.length - 1))];
}
