import { Unit } from "../.prisma-client/enums";
import { moneyAbs, moneySum, toMoney, toMoneyNumber } from "../shared/money";

export type TransactionsDerivedBooking = {
  id: string;
  date: Date;
  description: string | null;
  value: number;
  valueInReferenceCurrency: number | null;
  unit: Unit | null;
  currency: string | null;
  cryptocurrency: string | null;
  symbol: string | null;
  tradeCurrency: string | null;
  transactionId: string;
  transactionDescription: string | null;
  transactionCreatedAt: Date;
  account: {
    id: string;
    name: string;
  };
  isOpeningBalancesTransaction: boolean;
};

type TransactionsDerivedAccount = {
  id: string;
  name: string;
};

export type TransactionsDerivedBookingRow = {
  id: string;
  transactionId: string;
  bookingValue: number;
  date: string;
  account: TransactionsDerivedAccount;
  description: string;
  unit: Unit | null;
  currency: string | null;
  cryptocurrency: string | null;
  symbol: string | null;
  tradeCurrency: string | null;
  isOpeningBalancesTransaction: boolean;
  debit: number | null;
  credit: number | null;
  referenceDebit: number | null;
  referenceCredit: number | null;
};

export type TransactionsDerivedRow = {
  id: string;
  transactionId: string;
  date: string;
  debitAccounts: TransactionsDerivedAccount[];
  creditAccounts: TransactionsDerivedAccount[];
  description: string;
  unitIdentifiers: string[];
  referenceAmount: number | null;
  isOpeningBalancesTransaction: boolean;
  bookings: TransactionsDerivedBookingRow[];
};

function formatUtcDateLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  return `${day}.${month}.${year}`;
}

function getUnitIdentifier(booking: TransactionsDerivedBooking): string | null {
  switch (booking.unit) {
    case Unit.CURRENCY:
      return booking.currency;
    case Unit.CRYPTOCURRENCY:
      return booking.cryptocurrency;
    case Unit.SECURITY:
      return booking.symbol;
    default:
      return null;
  }
}

function uniqueById(
  accounts: TransactionsDerivedAccount[],
): TransactionsDerivedAccount[] {
  const seen = new Set<string>();
  const uniqueAccounts: TransactionsDerivedAccount[] = [];

  for (const account of accounts) {
    if (seen.has(account.id)) continue;
    seen.add(account.id);
    uniqueAccounts.push(account);
  }

  return uniqueAccounts;
}

function uniqueStrings(values: Array<string | null>): string[] {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    uniqueValues.push(value);
  }

  return uniqueValues;
}

function splitDebitCredit(value: number): {
  debit: number | null;
  credit: number | null;
} {
  const moneyValue = toMoney(value);
  const sign = moneyValue.comparedTo(0);

  if (sign > 0) {
    return { debit: toMoneyNumber(moneyValue), credit: null };
  }
  if (sign < 0) {
    return { debit: null, credit: toMoneyNumber(moneyValue.neg()) };
  }
  return { debit: null, credit: null };
}

function toBookingRow(
  booking: TransactionsDerivedBooking,
): TransactionsDerivedBookingRow {
  const { debit, credit } = splitDebitCredit(booking.value);
  const referenceValues =
    booking.valueInReferenceCurrency == null
      ? { debit: null, credit: null }
      : splitDebitCredit(booking.valueInReferenceCurrency);

  return {
    id: booking.id,
    transactionId: booking.transactionId,
    bookingValue: toMoneyNumber(booking.value),
    date: formatUtcDateLabel(booking.date),
    account: booking.account,
    description: booking.description ?? "",
    unit: booking.unit,
    currency: booking.currency,
    cryptocurrency: booking.cryptocurrency,
    symbol: booking.symbol,
    tradeCurrency: booking.tradeCurrency,
    isOpeningBalancesTransaction: booking.isOpeningBalancesTransaction,
    debit,
    credit,
    referenceDebit: referenceValues.debit,
    referenceCredit: referenceValues.credit,
  };
}

function getSideReferenceTotal(
  bookings: TransactionsDerivedBooking[],
): number | null {
  if (bookings.length === 0) {
    return 0;
  }

  if (bookings.some((booking) => booking.valueInReferenceCurrency == null)) {
    return null;
  }

  return toMoneyNumber(
    moneyAbs(
      moneySum(
        bookings.map((booking) => booking.valueInReferenceCurrency ?? 0),
      ),
    ),
  );
}

function getReferenceAmount(
  bookings: TransactionsDerivedBooking[],
): number | null {
  const debitTotal = getSideReferenceTotal(
    bookings.filter((booking) => toMoney(booking.value).comparedTo(0) > 0),
  );
  const creditTotal = getSideReferenceTotal(
    bookings.filter((booking) => toMoney(booking.value).comparedTo(0) < 0),
  );

  if (debitTotal == null || creditTotal == null) {
    return null;
  }

  return toMoneyNumber(
    toMoney(debitTotal).greaterThanOrEqualTo(creditTotal)
      ? debitTotal
      : creditTotal,
  );
}

export function deriveTransactionsRows(args: {
  bookings: TransactionsDerivedBooking[];
}): {
  rows: TransactionsDerivedRow[];
} {
  const bookingsByTransactionId = new Map<
    string,
    TransactionsDerivedBooking[]
  >();

  for (const booking of args.bookings) {
    const transactionBookings =
      bookingsByTransactionId.get(booking.transactionId) ?? [];
    transactionBookings.push(booking);
    bookingsByTransactionId.set(booking.transactionId, transactionBookings);
  }

  const rows = Array.from(bookingsByTransactionId.values()).map((bookings) => {
    const firstBooking = bookings[0];
    if (!firstBooking) {
      throw new Error("Cannot derive a transaction row without bookings.");
    }

    const earliestBookingDate = bookings.reduce(
      (earliestDate, booking) =>
        booking.date < earliestDate ? booking.date : earliestDate,
      firstBooking.date,
    );

    return {
      id: firstBooking.transactionId,
      transactionId: firstBooking.transactionId,
      date: formatUtcDateLabel(earliestBookingDate),
      debitAccounts: uniqueById(
        bookings
          .filter((booking) => toMoney(booking.value).comparedTo(0) > 0)
          .map((booking) => booking.account),
      ),
      creditAccounts: uniqueById(
        bookings
          .filter((booking) => toMoney(booking.value).comparedTo(0) < 0)
          .map((booking) => booking.account),
      ),
      description: firstBooking.transactionDescription ?? "",
      unitIdentifiers: uniqueStrings(bookings.map(getUnitIdentifier)),
      referenceAmount: getReferenceAmount(bookings),
      isOpeningBalancesTransaction: bookings.some(
        (booking) => booking.isOpeningBalancesTransaction,
      ),
      bookings: bookings.map(toBookingRow),
      sortDate: earliestBookingDate,
      transactionCreatedAt: firstBooking.transactionCreatedAt,
    };
  });

  rows.sort((left, right) => {
    const dateComparison = right.sortDate.getTime() - left.sortDate.getTime();
    if (dateComparison !== 0) return dateComparison;

    const createdAtComparison =
      right.transactionCreatedAt.getTime() -
      left.transactionCreatedAt.getTime();
    if (createdAtComparison !== 0) return createdAtComparison;

    return left.transactionId.localeCompare(right.transactionId);
  });

  return {
    rows: rows.map(
      ({ sortDate: _sortDate, transactionCreatedAt: _createdAt, ...row }) =>
        row satisfies TransactionsDerivedRow,
    ),
  };
}
