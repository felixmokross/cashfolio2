import type { Booking } from "@prisma/client";
import { redis } from "~/redis.server";
import { isAfter, isEqual } from "date-fns";

export function parseBookings(formData: FormData) {
  const out: Record<string, any>[] = [];

  for (const [key, value] of formData.entries()) {
    const m = key.match(/^bookings\[(\d+)\]\[(.+)\]$/);
    if (!m) continue;
    const [, idxStr, prop] = m;
    const idx = Number(idxStr);
    if (!out[idx]) out[idx] = {};
    out[idx][prop] = value;
  }

  return out.map((b) => ({
    date: String(b.date ?? ""),
    accountId: String(b.accountId ?? ""),
    description: String(b.description ?? ""),
    currency: String(b.currency ?? ""),
    value: String(b.value ?? ""),
  }));
}

export async function purgeCachedBalances(
  bookings: Pick<Booking, "accountId" | "date">[],
) {
  const keysToDelete = new Set<string>(
    (
      await Promise.all(
        bookings.map(async (b) => {
          const keys = await redis.keys(`account:${b.accountId}:balance:*`);
          return keys.filter((k) => {
            const keyDate = new Date(k.substring(k.lastIndexOf(":") + 1));
            return isAfter(keyDate, b.date) || isEqual(keyDate, b.date);
          });
        }),
      )
    ).flat(),
  );

  if (keysToDelete.size > 0) {
    await redis.del([...keysToDelete]);
  }
}
