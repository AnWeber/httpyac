export interface TestPredicate {
  readonly id: Array<string>;
  readonly noAutoConvert?: boolean;
  match(value: unknown, expected: unknown): boolean;
}
