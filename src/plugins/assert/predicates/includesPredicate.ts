import { toString } from '../../../utils';
import { TestPredicate } from './testPredicate';

export class IncludesPredicate implements TestPredicate {
  readonly id = ['contains', 'includes'];
  match(value: unknown, expected: unknown): boolean {
    const valString = toString(value);
    const expectedString = toString(expected);
    if (valString && expectedString) {
      return valString.includes(expectedString);
    }
    if (Array.isArray(value)) {
      return value.indexOf(expected) >= 0;
    }
    return false;
  }
}
