import type { Decimal } from "@prisma/client/runtime/library";
import { differenceInDays, max } from "date-fns";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
  type Account,
  type AccountBook,
  type AccountGroup,
} from "~/.prisma-client/client";
import type { BookingWithTransaction } from "~/accounts/detail/types";
import { convert } from "~/fx.server";
import { prisma } from "~/prisma.server";
import type { TransactionWithBookings } from "~/transactions/types";
import {
  getCurrencyUnitInfo,
  getUnitInfo,
  getUnitKey,
} from "~/units/functions";
import { sum } from "~/utils.server";

export const TRANSACTION_GAIN_LOSS_ACCOUNT_ID = "transaction-gain-loss";

export function isTransactionGainLossAccount(accountId: string) {
  return accountId === TRANSACTION_GAIN_LOSS_ACCOUNT_ID;
}

export function generateTransactionGainLossAccount(
  equityRootGroup: AccountGroup,
): Account {
  return {
    id: TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
    name: "Transaction Gain/Loss",
    groupId: equityRootGroup.id,
    type: AccountType.EQUITY,
    equityAccountSubtype: EquityAccountSubtype.GAIN_LOSS,
    createdAt: new Date(),
    updatedAt: new Date(),
    unit: null,
    currency: null,
    cryptocurrency: null,
    symbol: null,
    tradeCurrency: null,
    accountBookId: equityRootGroup.accountBookId,
    isActive: true,
  };
}

export async function generateTransactionGainLossBookings(
  accountBook: AccountBook,
  fromDate: Date | undefined,
  toDate: Date,
) {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountBookId: accountBook.id,
      // this ensures a transaction is always considered in the period into which the last booking falls
      AND: [
        // at least one booking within the period
        { bookings: { some: { date: { gte: fromDate, lte: toDate } } } },

        // no booking after the end of the period
        { bookings: { none: { date: { gt: toDate } } } },
      ],
    },
    include: {
      bookings: {
        orderBy: { date: "asc" },
      },
    },
  });

  // only consider transactions with bookings in multiple units
  const multiUnitTransactions = transactions.filter(isMultiUnitTransaction);

  const bookings = new Array<BookingWithTransaction>(
    multiUnitTransactions.length,
  );
  for (let i = 0; i < multiUnitTransactions.length; i++) {
    const t = multiUnitTransactions[i];
    bookings[i] = await generateTransactionGainLossBooking(
      accountBook.id,
      accountBook.referenceCurrency,
      t,
    );
  }
  return bookings
    .filter((b) => !b.value.isZero())
    .toSorted((a, b) => differenceInDays(b.date, a.date))
    .toReversed();
}

export function isMultiUnitTransaction(
  transaction: Pick<TransactionWithBookings, "bookings">,
) {
  return (
    new Set(transaction.bookings.map((b) => getUnitKey(getUnitInfo(b)))).size >
    1
  );
}

export async function generateTransactionGainLossBooking(
  accountBookId: string,
  referenceCurrency: string,
  transaction: TransactionWithBookings,
) {
  return {
    id: `transaction-gain-loss-${transaction.id}`,
    date: max(transaction.bookings.map((b) => b.date)),
    unit: Unit.CURRENCY,
    currency: referenceCurrency,
    cryptocurrency: null,
    symbol: null,
    tradeCurrency: null,
    value: await completeTransaction(referenceCurrency, transaction),
    accountId: TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
    description: `Transaction Gain/Loss for transaction ${transaction.description}`,
    transactionId: transaction.id,
    transaction: transaction,
    accountBookId,
  };
}

async function completeTransaction(
  referenceCurrency: string,
  transaction: TransactionWithBookings,
): Promise<Decimal> {
  const values = new Array<Decimal>(transaction.bookings.length);
  for (let i = 0; i < transaction.bookings.length; i++) {
    const b = transaction.bookings[i];
    values[i] = await convert(
      b.value,
      getUnitInfo(b),
      getCurrencyUnitInfo(referenceCurrency),
      b.date,
    );
  }

  const bookingsSum = sum(values);

  return bookingsSum.negated();
}
