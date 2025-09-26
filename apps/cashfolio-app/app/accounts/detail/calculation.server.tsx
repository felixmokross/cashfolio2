import { Prisma, Unit as UnitEnum, type Booking } from "@prisma/client";
import type { BookingWithTransaction, LedgerRow } from "./types";
import { convert } from "~/fx.server";
import { redis } from "~/redis.server";
import { prisma } from "~/prisma.server";
import type { Unit } from "~/fx";
import { isEqual } from "date-fns";
import {
  generateTransactionGainLossAccount,
  generateTransactionGainLossBookings,
  TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
} from "~/income/calculation.server";

export async function getAccount(accountId: string) {
  if (accountId === TRANSACTION_GAIN_LOSS_ACCOUNT_ID) {
    const equityRootGroup = await prisma.accountGroup.findFirst({
      where: { type: "EQUITY", parentGroupId: null },
    });
    if (!equityRootGroup) {
      throw new Error("Equity root group not found");
    }
    return generateTransactionGainLossAccount(equityRootGroup);
  }

  return await prisma.account.findUnique({
    where: { id: accountId },
    include: { group: true },
  });
}

export async function getBookings(
  accountId: string,
  fromDate: Date,
  toDate: Date,
) {
  if (accountId === TRANSACTION_GAIN_LOSS_ACCOUNT_ID) {
    // TODO this is duplicated with getIncomeStatement
    // TODO order these transcations by date to get a correct ledger
    const transactions = await prisma.transaction.findMany({
      where: {
        // this ensures a transaction is always considered in the period into which the last booking falls
        AND: [
          // at least one booking within the period
          { bookings: { some: { date: { gte: fromDate, lte: toDate } } } },

          // no booking after the end of the period
          { bookings: { none: { date: { gt: toDate } } } },

          // TODO how can we query for FX transactions only?
        ],
      },
      include: {
        bookings: {
          where: { date: { gte: fromDate, lte: toDate } },
          orderBy: { date: "asc" },
        },
      },
    });
    return await generateTransactionGainLossBookings(transactions);
  }

  return await prisma.booking.findMany({
    where: {
      accountId,
      AND: [
        ...(fromDate ? [{ date: { gte: fromDate } }] : []),
        ...(toDate ? [{ date: { lte: toDate } }] : []),
      ],
    },
    include: {
      transaction: {
        include: { bookings: true },
      },
    },
    orderBy: [{ date: "asc" }, { transaction: { createdAt: "asc" } }],
  });
}

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
