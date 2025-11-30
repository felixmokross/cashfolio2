export function sum(values: number[]): number {
  return values.reduce<number>((prev, curr) => prev + curr, 0);
}

type Identifiable = { id: string };

export function mergeById<T extends Identifiable>(...arrays: T[][]): T[] {
  const map = new Map<string, T>();
  for (const array of arrays) {
    for (const item of array) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}
