import { toString } from '../../../utils';
import { TestPredicate } from './testPredicate';

export class MatchesPredicate implements TestPredicate {
  readonly id = ['matches'];
  readonly noAutoConvert = true;
  match(value: unknown, expected: unknown): boolean {
    const valString = toString(value);
    const expectedString = toString(expected);
    if (valString && expectedString) {
      return new RegExp(expectedString, 'u').test(valString);
    }
    return false;
  }
}
