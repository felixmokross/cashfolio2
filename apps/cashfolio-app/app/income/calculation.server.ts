import {
  AccountType,
  Prisma,
  type Account,
  type AccountGroup,
  type Booking,
} from "@prisma/client";
import { addDays, differenceInDays, formatISO, max } from "date-fns";
import type { AccountWithBookings } from "~/accounts/types";
import { refCurrency } from "~/config";
import { formatISODate } from "~/formatting";
import type { TransactionWithBookings } from "~/transactions/types";
import { sum } from "~/utils";
import type { IncomeAccountsNode, IncomeData } from "./types";
import { getExchangeRate } from "~/fx.server";
import {
  getAccountsTree,
  type AccountsNode,
} from "~/account-groups/accounts-tree";

export async function getIncomeStatement(
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  transactions: TransactionWithBookings[],
  endDate: Date,
) {
  const incomeData = await getIncomeData(
    accounts,
    accountGroups,
    transactions,
    async (date, from, to) => (await getExchangeRate(from, to, date))!,
    endDate,
  );

  const equityRootNode = getAccountsTree(
    (accounts as Account[]).concat(incomeData.virtualAccounts),
    accountGroups.concat(incomeData.virtualAccountGroups),
  ).EQUITY;
  if (!equityRootNode) {
    throw new Error("No equity account group found");
  }

  function withIncomeData(node: AccountsNode): IncomeAccountsNode {
    if (node.nodeType === "accountGroup") {
      const children = node.children.map(withIncomeData);
      return { ...node, children, value: sum(children.map((c) => c.value)) };
    }

    return {
      ...node,
      value: incomeData.valueByAccountId.get(node.id) ?? new Prisma.Decimal(0),
    };
  }

  return withIncomeData(equityRootNode);
}

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

export async function getIncomeData(
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  transactions: TransactionWithBookings[],
  getFxRate: (date: Date, from: string, to: string) => Promise<Prisma.Decimal>,
  endDate: Date,
): Promise<IncomeData> {
  const equityAccounts = accounts.filter((a) => a.type === AccountType.EQUITY);

  const equityRootGroup = accountGroups.find(
    (g) => g.type === AccountType.EQUITY && !g.parentGroupId,
  )!;

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
            id: `fx-holding-${a.id}`,
            type: AccountType.EQUITY,
            currency: refCurrency,
            bookings: await generateFxBookingsForFxAccount(
              a,
              getFxRate,
              endDate,
            ),
            name: `FX Holding Gain/Loss for ${a.name}`,
            slug: `fx-holding-${a.slug}`,
            groupId: equityRootGroup.id,
            unit: a.unit,
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as AccountWithBookings,
      ),
  );

  const fxTransferAccount = {
    id: "fx-conversion",
    name: "FX Conversion Gain/Loss",
    slug: "fx-conversion",
    groupId: equityRootGroup.id,
    type: AccountType.EQUITY,
    currency: refCurrency,
    bookings: await Promise.all(
      transactions.map(async (t) => ({
        id: `fx-conversion-${t.id}`,
        date: max(t.bookings.map((b) => b.date)),
        currency: refCurrency,
        value: await completeFxTransaction(t, getFxRate),
      })),
    ),
  } as AccountWithBookings;

  return {
    virtualAccounts: fxAccounts.concat(fxTransferAccount),
    virtualAccountGroups: [],
    valueByAccountId: new Map<string, Prisma.Decimal>(
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
    ),
  };
}
