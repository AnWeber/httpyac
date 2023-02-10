export interface TestPredicate {
  readonly id: string;
  readonly noAutoConvert?: boolean;
  match(value: unknown, expected: unknown): boolean;
}
