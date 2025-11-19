import { Decimal } from "@prisma/client/runtime/library";
import { isAfter, subDays } from "date-fns";
import type { Booking } from "~/.prisma-client/client";
import { Unit } from "~/.prisma-client/enums";
import { today } from "~/dates";
import { redis } from "~/redis.server";
import { sum } from "~/utils.server";

export function validate(bookings: BookingFormData[]) {
  const errors: FormErrors = {};

  let hasBookingValueError = false;
  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    if (!b.date || isNaN(new Date(b.date).getTime())) {
      errors[`bookings[${i}][date]`] = "Invalid date";
    } else if (isAfter(b.date, subDays(today(), 1))) {
      errors[`bookings[${i}][date]`] = "Date cannot be in the future";
    }

    if (!b.accountId) {
      errors[`bookings[${i}][accountId]`] = "Account is required";
    }

    if (!b.unit) {
      errors[`bookings[${i}][unit]`] = "Unit is required";
    } else if (b.unit === Unit.CURRENCY && !b.currency) {
      errors[`bookings[${i}][currency]`] = "Currency is required";
    } else if (b.unit === Unit.CRYPTOCURRENCY && !b.cryptocurrency) {
      errors[`bookings[${i}][cryptocurrency]`] = "Cryptocurrency is required";
    } else if (b.unit === Unit.SECURITY && !b.symbol) {
      errors[`bookings[${i}][symbol]`] = "Symbol is required";
    }

    if (!b.value || isNaN(Number(b.value)) || new Decimal(b.value).isZero()) {
      hasBookingValueError = true;
      errors[`bookings[${i}][value]`] = "Value must be a non-zero number";
    }
  }

  if (bookings.length < 2) {
    errors.form = "At least two bookings are required.";
  } else if (
    !hasBookingValueError &&
    isSingleUnitTransaction(bookings) && // we can only check this for single-currency transactions
    !sum(bookings.map((b) => b.value)).isZero()
  ) {
    errors.form = "The sum of all bookings must be zero.";
  }

  return errors;
}

function isSingleUnitTransaction(bookings: BookingFormData[]) {
  return (
    new Set(
      bookings.map((b) =>
        b.currency
          ? `currency:${b.currency}`
          : b.cryptocurrency
            ? `crypto:${b.cryptocurrency}`
            : b.symbol
              ? `symbol:${b.symbol}`
              : "",
      ),
    ).size === 1
  );
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
    unit: String(b.unit ?? ""),
    currency: String(b.currency ?? ""),
    cryptocurrency: String(b.cryptocurrency ?? ""),
    symbol: String(b.symbol ?? ""),
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
