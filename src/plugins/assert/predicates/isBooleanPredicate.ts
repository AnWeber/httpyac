import { TestPredicate } from './testPredicate';

export class IsBooleanPredicate implements TestPredicate {
  readonly id = ['isBoolean'];
  match(value: unknown): boolean {
    return typeof value === 'boolean';
  }
}
