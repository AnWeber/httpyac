import { TestPredicate } from './testPredicate';

export class EqualsPredicate implements TestPredicate {
  readonly id = ['==', '===', 'equals'];
  match(value: unknown, expected: unknown): boolean {
    if (typeof value === 'object' || Array.isArray(value)) {
      return JSON.stringify(value) === JSON.stringify(expected);
    }

    return value === expected;
  }
}
