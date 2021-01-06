export function isPromise(obj: any): obj is Promise < any > {
  return obj && obj.then;
}