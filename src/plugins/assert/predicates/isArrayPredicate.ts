import { TestPredicate } from './testPredicate';

export class IsArrayPredicate implements TestPredicate {
  readonly id = ['isArray'];
  match(value: unknown): boolean {
    return Array.isArray(value);
  }
}
