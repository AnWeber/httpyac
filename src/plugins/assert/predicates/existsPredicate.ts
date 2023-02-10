import { TestPredicate } from './testPredicate';

export class ExistsPredicate implements TestPredicate {
  readonly id = 'exists';
  match(value: unknown): boolean {
    return !!value;
  }
}
