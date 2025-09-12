import {
  AccountType,
  Prisma,
  type Account,
  type Booking,
  type Transaction,
} from "@prisma/client";
import { addDays, differenceInDays, formatISO, max } from "date-fns";
import { refCurrency } from "~/config";
import { formatISODate } from "~/formatting";
import { sum } from "~/utils";

export function getBalanceByDate(
  account: AccountWithBookings,
): Map<string, Prisma.Decimal> {
  // TODO this relies on the bookings being sorted
  // decide if we want to enforce that here or somewhere else
  const bookingsByDate = account.bookings.reduce((acc, booking) => {
    const dateKey = formatISODate(booking.date);
    const bookings = acc.get(dateKey);
    if (bookings) {
      bookings.push(booking);
    } else {
      acc.set(dateKey, [booking]);
    }

    return acc;
  }, new Map<string, Booking[]>());

  const balanceByDate = new Map<string, Prisma.Decimal>();
  let balance = new Prisma.Decimal(0);

  for (const [dateKey, bookings] of bookingsByDate) {
    balance = balance.plus(sum(bookings.map((b) => b.value)));
    balanceByDate.set(dateKey, balance);
  }

  return balanceByDate;
}

export async function generateFxBookingsForFxAccount(
  fxAccount: AccountWithBookings,
  getFxRate: (date: Date, from: string, to: string) => Promise<Prisma.Decimal>,
  endDate: Date,
): Promise<Booking[]> {
  if (fxAccount.bookings.length === 0) {
    return [];
  }

  const initialDate = fxAccount.bookings[0].date;
  console.log(initialDate);
  const balanceByDate = getBalanceByDate(fxAccount);

  let balance = balanceByDate.get(formatISODate(initialDate));
  if (!balance) {
    throw new Error("Initial balance not found");
  }

  let fxRate = await getFxRate(initialDate, fxAccount.currency!, refCurrency);

  const startDate = addDays(initialDate, 1);
  const numberOfDays = differenceInDays(endDate, startDate);
  if (numberOfDays < 0) {
    // TODO test
    return [];
  }

  const bookings = new Array(numberOfDays);
  let date = startDate;

  for (let i = 0; i <= numberOfDays; i++, date = addDays(date, 1)) {
    const newFxRate = await getFxRate(date, fxAccount.currency!, refCurrency);
    const fxRateDiff = newFxRate.minus(fxRate);

    bookings[i] = {
      id: `fx-booking-${fxAccount.id}-${formatISODate(date)}`,
      date,
      accountId: fxAccount.id,
      value: balance.mul(fxRateDiff).negated(),
      currency: refCurrency,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: `FX P/L as of ${formatISO(date, { representation: "date" })}`,
      transactionId: "transaction-fx-profit-loss",
    };

    // TODO test this better, if new balance is set before calculating the FX booking value, it's wrong
    balance = balanceByDate.get(formatISODate(date)) ?? balance;
    fxRate = newFxRate;
  }

  return bookings;
}

export async function completeFxTransaction(
  transaction: TransactionWithBookings,
  getFxRate: (date: Date, from: string, to: string) => Promise<Prisma.Decimal>,
): Promise<Prisma.Decimal> {
  const bookingsSum = sum(
    await Promise.all(
      transaction.bookings.map(async (b) =>
        (await getFxRate(b.date, b.currency, refCurrency)).mul(b.value),
      ),
    ),
  );

  return bookingsSum.negated();
}

export async function getProfitLossStatement(
  accounts: AccountWithBookings[],
  transactions: TransactionWithBookings[],
  getFxRate: (date: Date, from: string, to: string) => Promise<Prisma.Decimal>,
  endDate: Date,
): Promise<ProfitLossStatement> {
  const equityAccounts = accounts.filter((a) => a.type === AccountType.EQUITY);

  const fxAccounts = await Promise.all(
    accounts
      .filter(
        (a) =>
          (
            [AccountType.ASSET, AccountType.LIABILITY] as AccountType[]
          ).includes(a.type) && a.currency !== refCurrency,
      )
      .map(
        async (a) =>
          ({
            id: `fx-${a.id}`,
            type: AccountType.EQUITY,
            currency: refCurrency,
            bookings: await generateFxBookingsForFxAccount(
              a,
              getFxRate,
              endDate,
            ),
            name: `FX P/L ${a.name}`,
            slug: `fx-pl-${a.slug}`,
            groupId: "fx-pl",
            unit: a.unit,
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as AccountWithBookings,
      ),
  );

  const fxTransferAccount = {
    id: "fx-transfer",
    name: "FX Transfer",
    slug: "fx-transfer",
    groupId: "fx-transfer",
    type: AccountType.EQUITY,
    currency: refCurrency,
    bookings: await Promise.all(
      transactions.map(async (t) => ({
        id: `fx-transfer-${t.id}`,
        date: max(t.bookings.map((b) => b.date)),
        currency: refCurrency,
        value: await completeFxTransaction(t, getFxRate),
      })),
    ),
  } as AccountWithBookings;

  return new Map<string, Prisma.Decimal>(
    await Promise.all(
      equityAccounts
        .concat(fxAccounts)
        .concat(fxTransferAccount)
        .map(
          async (a) =>
            [
              a.id,
              sum(
                await Promise.all(
                  a.bookings.map(async (b) =>
                    (await getFxRate(b.date, b.currency, refCurrency)).mul(
                      b.value,
                    ),
                  ),
                ),
              ).negated(),
            ] as const,
        ),
    ),
  );
}

export type ProfitLossStatement = Map<string, Prisma.Decimal>;

export type AccountWithBookings = Account & {
  bookings: Booking[];
};

export type TransactionWithBookings = Transaction & {
  bookings: Booking[];
};
