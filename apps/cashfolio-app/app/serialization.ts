import { Prisma } from "@prisma/client";

export type Serialize<T> =
  // Turn Decimal into string
  T extends Prisma.Decimal
    ? number
    : T extends Date
      ? string
      : // Recurse into arrays/tuples (preserves tuple shapes)
        T extends readonly [/* infer tuple */ ...infer U]
        ? { [K in keyof T]: Serialize<T[K]> }
        : T extends ReadonlyArray<infer U>
          ? ReadonlyArray<Serialize<U>>
          : T extends Array<infer U>
            ? Array<Serialize<U>>
            : // Recurse into objects (preserves optional/readonly modifiers)
              T extends object
              ? { [K in keyof T]: Serialize<T[K]> }
              : // Leave primitives/unions as-is (besides Decimal handled above)
                T;

export function serialize<T>(input: T): Serialize<T> {
  // Decimal check (Prisma re-exports Decimal.js, which provides isDecimal)
  if (Prisma.Decimal.isDecimal(input as any)) {
    return (input as unknown as Prisma.Decimal).toNumber() as Serialize<T>;
  }

  if (input instanceof Date) {
    // TODO temporary workaround, remove
    try {
      return input.toISOString() as Serialize<T>;
    } catch {
      return "<invalid>" as Serialize<T>;
    }
  }

  // Arrays / tuples
  if (Array.isArray(input)) {
    return (input as unknown as Array<unknown>).map(serialize) as Serialize<T>;
  }

  // Objects (exclude null)
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out as Serialize<T>;
  }

  // Primitives, functions, null, undefined -> unchanged
  return input as Serialize<T>;
}
