import { TestPredicate } from './testPredicate';

export class IsNumberPredicate implements TestPredicate {
  readonly id = ['isNumber'];
  match(value: unknown): boolean {
    return typeof value === 'number';
  }
}
