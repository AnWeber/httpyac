import { TestPredicate } from './testPredicate';

export class IsStringPredicate implements TestPredicate {
  readonly id = ['isString'];
  match(value: unknown): boolean {
    return typeof value === 'string';
  }
}
