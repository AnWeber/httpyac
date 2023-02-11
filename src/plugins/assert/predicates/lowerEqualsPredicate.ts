import { toNumber } from '../../../utils';
import { TestPredicate } from './testPredicate';

export class LowerEqualsPredicate implements TestPredicate {
  readonly id = ['<='];
  match(value: unknown, expected: unknown): boolean {
    const valNumber = toNumber(value);
    const expectedNumber = toNumber(expected);
    if (valNumber && expectedNumber) {
      return valNumber <= expectedNumber;
    }
    return false;
  }
}
