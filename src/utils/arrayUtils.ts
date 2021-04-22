



export function pushAfter<T>(array: T[], predicate: (obj: T) => boolean, ...params: T[]) : void {
  const index = array.findIndex(predicate);
  if (index >= 0) {
    array.splice(index + 1, 0, ...params);
  } else {
    array.push(...params);
  }
}