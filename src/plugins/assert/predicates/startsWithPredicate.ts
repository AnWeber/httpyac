import { toString } from '../../../utils';
import { TestPredicate } from './testPredicate';

export class StartsWithPredicate implements TestPredicate {
  readonly id = ['startsWith'];
  match(value: unknown, expected: unknown): boolean {
    const valString = toString(value);
    const expectedString = toString(expected);
    if (valString && expectedString) {
      return valString?.startsWith(expectedString);
    }
    return false;
  }
}
