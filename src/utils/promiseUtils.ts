// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function isPromise(obj: any): obj is Promise<unknown> {
  return obj && obj.then;
}