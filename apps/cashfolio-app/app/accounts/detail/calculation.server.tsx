import type { BookingWithTransaction, LedgerRow } from "./types";
import { convert } from "~/fx.server";
import { redis } from "~/redis.server";
import { prisma } from "~/prisma.server";
import { isAfter, isEqual } from "date-fns";
import { Decimal } from "@prisma/client/runtime/library";
import type { AccountBook, Booking } from "~/.prisma-client/client";
import { Unit as UnitEnum } from "~/.prisma-client/enums";
import { sum } from "~/utils.server";
import { TRANSFER_CLEARING_ACCOUNT_ID } from "../constants";
import invariant from "tiny-invariant";
import type { UnitInfo } from "~/units/types";
import { getUnitInfo } from "~/units/functions";
import {
  generateTransactionGainLossAccount,
  generateTransactionGainLossBooking,
  generateTransactionGainLossBookings,
  TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
} from "~/income/transaction-gain-loss.server";
import {
  generateHoldingBookingsForAccount,
  generateHoldingGainLossAccount,
} from "~/income/holding-gain-loss.server";

export async function getAccount(accountId: string, accountBookId: string) {
  if (accountId === TRANSACTION_GAIN_LOSS_ACCOUNT_ID) {
    const equityRootGroup = await prisma.accountGroup.findFirst({
      where: { type: "EQUITY", parentGroupId: null },
    });
    if (!equityRootGroup) {
      throw new Error("Equity root group not found");
    }
    return generateTransactionGainLossAccount(equityRootGroup);
  }

  if (accountId.startsWith("holding-gain-loss-")) {
    const baseAccountId = accountId.substring("holding-gain-loss-".length);
    const baseAccount = await prisma.account.findUnique({
      where: { id_accountBookId: { id: baseAccountId, accountBookId } },
    });
    if (!baseAccount) {
      throw new Error(`Base account ${baseAccountId} not found`);
    }

    const holdingGainLossAccount = generateHoldingGainLossAccount(baseAccount);

    return holdingGainLossAccount;
  }

  return await prisma.account.findUnique({
    where: { id_accountBookId: { id: accountId, accountBookId } },
    include: { group: true },
  });
}

export async function getBookings(
  accountId: string,
  accountBook: AccountBook,
  fromDate: Date,
  toDate: Date,
) {
  if (accountId === TRANSACTION_GAIN_LOSS_ACCOUNT_ID) {
    return await generateTransactionGainLossBookings(
      accountBook,
      fromDate,
      toDate,
    );
  }

  if (accountId.startsWith("holding-gain-loss-")) {
    const baseAccountId = accountId.substring("holding-gain-loss-".length);
    const baseAccount = await prisma.account.findUnique({
      where: {
        id_accountBookId: { id: baseAccountId, accountBookId: accountBook.id },
      },
      include: {
        bookings: { where: { date: { gte: fromDate, lte: toDate } } },
      },
    });
    if (!baseAccount) {
      throw new Error(`Base account ${baseAccountId} not found`);
    }
    return await generateHoldingBookingsForAccount(
      accountBook,
      baseAccount,
      fromDate,
      toDate,
    );
  }

  return await prisma.booking.findMany({
    where: {
      accountId,
      accountBookId: accountBook.id,
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
  accountBookId: string,
  accountId: string,
  ledgerUnitInfo: UnitInfo,
  date: Date,
) {
  if (accountId === TRANSFER_CLEARING_ACCOUNT_ID) {
    return await getTransferClearingBalance(
      accountBookId,
      ledgerUnitInfo,
      date,
    );
  }

  const cacheKey = `account-book:${accountBookId}:account:${accountId}:balance`;
  const [cacheEntry] = (await redis.exists(cacheKey))
    ? await redis.ts.REVRANGE(cacheKey, "-", date.getTime(), { COUNT: 1 })
    : [];

  if (cacheEntry && isEqual(cacheEntry.timestamp, date)) {
    return new Decimal(cacheEntry.value);
  }

  const bookings = await prisma.booking.findMany({
    where: {
      accountBookId,
      accountId,
      date: {
        gt: cacheEntry ? new Date(cacheEntry.timestamp) : undefined,
        lte: date,
      },
    },
  });

  const balance = (
    cacheEntry ? new Decimal(cacheEntry.value) : new Decimal(0)
  ).plus(await getBalance(bookings, ledgerUnitInfo));
  console.log(
    `Basis date: ${cacheEntry ? new Date(cacheEntry.timestamp) : "none"}`,
  );
  console.log(`bookings: ${bookings.length}`);

  await redis.ts.add(cacheKey, date.getTime(), balance.toNumber());

  return balance;
}

async function getTransferClearingBalance(
  accountBookId: string,
  ledgerUnitInfo: UnitInfo,
  date: Date,
) {
  // TODO improve, make more granular (account per transaction and/or currency/unit etc)
  return sum(
    await Promise.all(
      (
        await getTransferClearingTransactions(
          accountBookId,
          ledgerUnitInfo,
          date,
        )
      ).map(async (t) =>
        sum(
          await Promise.all(
            t.bookings
              .filter((b) => isAfter(b.date, date))
              .map((b) =>
                convert(b.value, getUnitInfo(b), ledgerUnitInfo, b.date),
              ),
          ),
        ),
      ),
    ),
  );
}

async function getTransferClearingTransactions(
  accountBookId: string,
  ledgerUnitInfo: UnitInfo,
  date: Date,
) {
  invariant(
    ledgerUnitInfo.unit === UnitEnum.CURRENCY,
    "Currency unit expected",
  );
  const transactions = await prisma.transaction.findMany({
    where: {
      accountBookId,
      AND: [
        { bookings: { some: { date: { lte: date } } } },
        { bookings: { some: { date: { gt: date } } } },
      ],
    },
    include: { bookings: true },
  });

  return await Promise.all(
    transactions.map(async (t) => ({
      ...t,
      bookings: [
        ...t.bookings,
        await generateTransactionGainLossBooking(
          accountBookId,
          ledgerUnitInfo.currency,
          t,
        ),
      ],
    })),
  );
}

export async function getBalance(
  bookings: Booking[],
  ledgerUnitInfo: UnitInfo,
) {
  let balance = new Decimal(0);
  for (let i = 0; i < bookings.length; i++) {
    balance = balance.add(
      await getBookingValueInLedgerUnit(bookings[i], ledgerUnitInfo),
    );
  }
  return balance;
}

export async function getLedgerRows(
  bookings: BookingWithTransaction[],
  ledgerUnitInfo: UnitInfo,
  openingBalance?: Decimal,
) {
  const rows = new Array<LedgerRow>(bookings.length);

  let balance = openingBalance ?? new Decimal(0);

  for (let i = 0; i < bookings.length; i++) {
    const valueInLedgerUnit = await getBookingValueInLedgerUnit(
      bookings[i],
      ledgerUnitInfo,
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

async function getBookingValueInLedgerUnit(
  booking: Booking,
  ledgerUnitInfo: UnitInfo,
) {
  return await convert(
    booking.value,
    getUnitInfo(booking),
    ledgerUnitInfo,
    booking.date,
  );
}
