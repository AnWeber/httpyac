import { toString } from '../../../utils';
import { TestPredicate } from './testPredicate';

export class EndsWithPredicate implements TestPredicate {
  readonly id = ['endsWith'];
  match(value: unknown, expected: unknown): boolean {
    const valString = toString(value);
    const expectedString = toString(expected);
    if (valString && expectedString) {
      return valString?.endsWith(expectedString);
    }
    return false;
  }
}
