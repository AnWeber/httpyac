export function distinct<T>(array: Array<T>): Array<T> {
  function onlyUnique(value: T, index: number, self: Array<T>) {
    return self.indexOf(value) === index;
  }

  return array.filter(onlyUnique);
}
