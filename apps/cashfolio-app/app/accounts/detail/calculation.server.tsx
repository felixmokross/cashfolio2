import { Prisma, Unit as UnitEnum, type Booking } from "@prisma/client";
import type { BookingWithTransaction, LedgerRow } from "./types";
import { convert } from "~/fx.server";
import { redis } from "~/redis.server";
import { formatISODate } from "~/formatting";
import { prisma } from "~/prisma.server";
import type { Unit } from "~/fx";

export async function getBalanceCached(
  accountId: string,
  ledgerUnit: Unit,
  date: Date,
) {
  const balanceString = await redis.get(
    `account:${accountId}:balance:${formatISODate(date)}`,
  );

  if (balanceString) {
    return new Prisma.Decimal(balanceString);
  }

  const balance = await getBalance(
    await prisma.booking.findMany({
      where: {
        accountId,
        date: { lte: date },
      },
    }),
    ledgerUnit,
  );
  await redis.set(
    `account:${accountId}:balance:${formatISODate(date)}`,
    balance.toString(),
  );

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
