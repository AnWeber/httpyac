import { TestPredicate } from './testPredicate';

export class NotEqualsPredicate implements TestPredicate {
  readonly id = '!=';
  match(value: unknown, expected: unknown): boolean {
    return value !== expected;
  }
}
