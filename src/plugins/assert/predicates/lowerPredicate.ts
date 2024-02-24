import { toNumber } from '../../../utils';
import { TestPredicate } from './testPredicate';

export class LowerPredicate implements TestPredicate {
  readonly id = ['<'];
  match(value: unknown, expected: unknown): boolean {
    const valNumber = toNumber(value);
    const expectedNumber = toNumber(expected);
    if (valNumber !== undefined && expectedNumber !== undefined) {
      return valNumber < expectedNumber;
    }
    return false;
  }
}
