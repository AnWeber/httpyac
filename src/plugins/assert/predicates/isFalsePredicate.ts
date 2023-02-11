import { TestPredicate } from './testPredicate';

export class IsFalsePredicate implements TestPredicate {
  readonly id = ['isFalse'];
  match(value: unknown): boolean {
    return !value;
  }
}
