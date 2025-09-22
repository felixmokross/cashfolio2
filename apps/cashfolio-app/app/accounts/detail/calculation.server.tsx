import { Prisma, Unit as UnitEnum, type Booking } from "@prisma/client";
import type { BookingWithTransaction, LedgerRow } from "./types";
import { convert } from "~/fx.server";
import { redis } from "~/redis.server";
import { prisma } from "~/prisma.server";
import type { Unit } from "~/fx";
import { isEqual } from "date-fns";
import { formatISODate } from "~/formatting";

export async function getBalanceCached(
  accountId: string,
  ledgerUnit: Unit,
  date: Date,
) {
  const cacheKey = `account:${accountId}:balance`;
  const [cacheEntry] = (await redis.exists(cacheKey))
    ? await redis.ts.REVRANGE(cacheKey, "-", date.getTime(), { COUNT: 1 })
    : [];

  if (cacheEntry && isEqual(cacheEntry.timestamp, date)) {
    return new Prisma.Decimal(cacheEntry.value);
  }

  const bookings = await prisma.booking.findMany({
    where: {
      accountId,
      date: {
        gt: cacheEntry ? new Date(cacheEntry.timestamp) : undefined,
        lte: date,
      },
    },
  });

  const balance = (
    cacheEntry ? new Prisma.Decimal(cacheEntry.value) : new Prisma.Decimal(0)
  ).plus(await getBalance(bookings, ledgerUnit));
  console.log(
    `Basis date: ${cacheEntry ? new Date(cacheEntry.timestamp) : "none"}`,
  );
  console.log(`bookings: ${bookings.length}`);

  await redis.ts.add(cacheKey, date.getTime(), balance.toNumber());

  return balance;
}

export async function getBalance(bookings: Booking[], ledgerUnit: Unit) {
  let balance = new Prisma.Decimal(0);
  for (let i = 0; i < bookings.length; i++) {
    balance = balance.add(
      await getBookingValueInLedgerUnit(bookings[i], ledgerUnit),
    );
  }
  return balance;
}

export async function getLedgerRows(
  bookings: BookingWithTransaction[],
  ledgerUnit: Unit,
  openingBalance?: Prisma.Decimal,
) {
  const rows = new Array<LedgerRow>(bookings.length + 1);

  let balance = openingBalance ?? new Prisma.Decimal(0);

  for (let i = 0; i < bookings.length; i++) {
    const valueInLedgerUnit = await getBookingValueInLedgerUnit(
      bookings[i],
      ledgerUnit,
    );
    balance = balance.add(valueInLedgerUnit);
    rows[i] = {
      booking: bookings[i],
      valueInLedgerUnit,
      balance,
    };
  }

  return rows;
}

async function getBookingValueInLedgerUnit(booking: Booking, ledgerUnit: Unit) {
  return await convert(
    booking.value,
    booking.unit === UnitEnum.CURRENCY
      ? { unit: UnitEnum.CURRENCY, currency: booking.currency! }
      : booking.unit === UnitEnum.CRYPTOCURRENCY
        ? {
            unit: UnitEnum.CRYPTOCURRENCY,
            cryptocurrency: booking.cryptocurrency!,
          }
        : {
            unit: UnitEnum.SECURITY,
            symbol: booking.symbol!,
            tradeCurrency: booking.tradeCurrency!,
          },
    ledgerUnit,
    booking.date,
  );
}
