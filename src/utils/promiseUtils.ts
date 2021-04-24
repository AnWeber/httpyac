export function isPromise(obj: unknown): obj is Promise<unknown> {
  const guard = obj as Promise<unknown>;
  return guard && !!guard.then;
}
