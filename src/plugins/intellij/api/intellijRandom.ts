import dayjs from 'dayjs';
import { randomEmail, randomText } from '../../../utils';
import { v4 } from 'uuid';

export class IntellijRandom {
  alphabetic(length = 10) {
    return randomText(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
  }
  numeric(length = 10) {
    return randomText(length);
  }
  hexadecimal(length = 10) {
    return randomText(length, '1234567890ABCDEF');
  }
  get email() {
    return randomEmail();
  }
  float(from = 0, to = 100) {
    return Math.random() * (to - from) + from;
  }
  integer(from = 0, to = 100) {
    return Math.floor(Math.random() * (to - from) + from);
  }
  get uuid() {
    return v4();
  }
  date(date: Date = new Date(), format: string | undefined = undefined) {
    return dayjs(date).format(format);
  }
}
