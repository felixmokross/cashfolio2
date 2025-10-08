import { Decimal } from "@prisma/client/runtime/library";
import type { Booking } from "~/.prisma-client/client";
import { redis } from "~/redis.server";
import { sum } from "~/utils";

export function validate(bookings: BookingFormData[]) {
  const errors: FormErrors = {};

  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    if (!b.date || isNaN(new Date(b.date).getTime())) {
      errors[`bookings[${i}][date]`] = "Invalid date";
    }
    if (!b.accountId) {
      errors[`bookings[${i}][accountId]`] = "Account is required";
    }
    if (!b.currency) {
      errors[`bookings[${i}][currency]`] = "Currency is required";
    }
    if (!b.value || isNaN(Number(b.value)) || new Decimal(b.value).isZero()) {
      errors[`bookings[${i}][value]`] = "Value must be a non-zero number";
    }
  }

  if (bookings.length < 2) {
    errors.form = "At least two bookings are required.";
  } else if (
    !sum(bookings.map((b) => b.value)).isZero() &&
    new Set(bookings.map((b) => b.currency)).size === 1
  ) {
    errors.form = "The sum of all bookings must be zero.";
  }

  return errors;
}

export function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}

export type FormErrors = { form?: string } & { [key: string]: string };

export type BookingFormData = ReturnType<typeof parseBookings>[number];

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
  accountBookId: string,
  bookings: Pick<Booking, "accountId" | "date">[],
) {
  await Promise.all(
    bookings.map(async (b) => {
      const cacheKey = `account-book:${accountBookId}:account:${b.accountId}:balance`;
      if (await redis.exists(cacheKey)) {
        await redis.ts.del(cacheKey, b.date.getTime(), "+");
      }
    }),
  );
}
