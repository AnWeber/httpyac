import { stringifySafe } from '../../../utils';
import { TestPredicate } from './testPredicate';

export class EqualsPredicate implements TestPredicate {
  readonly id = ['==', '===', 'equals'];
  match(value: unknown, expected: unknown): boolean {
    if (typeof value === 'object') {
      return stringifySafe(value) === stringifySafe(expected);
    }
    return value === expected;
  }
}
