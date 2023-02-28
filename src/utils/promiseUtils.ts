export function isPromise(obj: unknown): obj is Promise<unknown> {
  const guard = obj as Promise<unknown>;
  return guard && !!guard.then;
}

export function sleep(timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

export async function promiseQueue<T>(batchSize: number, ...promises: Array<() => Promise<T>>) {
  const result: Array<T> = [];
  const queue = async () => {
    let promise: (() => Promise<T>) | undefined;
    while ((promise = promises.shift())) {
      result.push(await promise());
    }
  };

  const queuePromises: Array<Promise<unknown>> = [];
  for (let index = 0; index < batchSize; index++) {
    queuePromises.push(queue());
  }
  await Promise.all(queuePromises);
  return result;
}
