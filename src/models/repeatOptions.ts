export enum RepeatOrder {
  sequential,
  parallel,
}

export interface RepeatOptions {
  type: RepeatOrder;
  count: number;
}
