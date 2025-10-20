import {
  differenceInDays,
  formatISO,
  isSameMonth,
  max,
  subDays,
} from "date-fns";
import type { AccountWithBookings } from "~/accounts/types";
import { formatISODate } from "~/formatting";
import type { TransactionWithBookings } from "~/transactions/types";
import { sum } from "~/utils";
import type { IncomeAccountsNode, IncomeData } from "./types";
import { convert, getExchangeRate } from "~/fx.server";
import {
  getAccountsTree,
  type AccountsNode,
} from "~/account-groups/accounts-tree";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import type { BookingWithTransaction } from "~/accounts/detail/types";
import { prisma } from "~/prisma.server";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
} from "~/.prisma-client/enums";
import { Decimal } from "@prisma/client/runtime/library";
import type {
  Account,
  AccountBook,
  AccountGroup,
} from "~/.prisma-client/client";
import { redis } from "~/redis.server";

export async function getIncomeStatement(
  accountBook: AccountBook,
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  fromDate: Date,
  toDate: Date,
) {
  const incomeData = await getIncomeData(
    accountBook,
    accounts,
    accountGroups,
    fromDate,
    toDate,
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
      const children = node.children
        .map(withIncomeData)
        .filter((child) => !child.value.isZero())

        .toSorted((a, b) => b.value.minus(a.value).toNumber())
        .toSorted(
          (a, b) =>
            (a.nodeType === "accountGroup" && a.sortOrder != null
              ? a.sortOrder
              : Infinity) -
            (b.nodeType === "accountGroup" && b.sortOrder != null
              ? b.sortOrder
              : Infinity),
        );
      return { ...node, children, value: sum(children.map((c) => c.value)) };
    }

    return {
      ...node,
      value: incomeData.valueByAccountId.get(node.id) ?? new Decimal(0),
    };
  }

  return withIncomeData(equityRootNode);
}

export async function generateHoldingBookingsForAccount(
  accountBook: AccountBook,
  fxAccount: AccountWithBookings,
  fromDate: Date,
  toDate: Date,
): Promise<BookingWithTransaction[]> {
  const initialDate = subDays(fromDate, 1);

  const fxAccountUnit =
    fxAccount.unit === Unit.CURRENCY
      ? {
          unit: Unit.CURRENCY,
          currency: fxAccount.currency!,
        }
      : fxAccount.unit === Unit.CRYPTOCURRENCY
        ? {
            unit: Unit.CRYPTOCURRENCY,
            cryptocurrency: fxAccount.cryptocurrency!,
          }
        : {
            unit: Unit.SECURITY,
            symbol: fxAccount.symbol!,
            tradeCurrency: fxAccount.tradeCurrency!,
          };

  let balance = await getBalanceCached(
    accountBook.id,
    fxAccount.id,
    fxAccountUnit,
    initialDate,
  );

  if (balance.isZero() && fxAccount.bookings.length === 0) {
    // no balance and no bookings within this period, nothing to do
    return [];
  }

  let fxRate = await getExchangeRate(
    fxAccountUnit,
    { unit: Unit.CURRENCY, currency: accountBook.referenceCurrency },
    initialDate,
  );

  const bookings = new Array<BookingWithTransaction>(
    fxAccount.bookings.length + 1,
  );

  for (let i = 0; i < bookings.length; i++) {
    const date = fxAccount.bookings[i]?.date ?? toDate;
    const newFxRate = await getExchangeRate(
      fxAccountUnit,
      { unit: Unit.CURRENCY, currency: accountBook.referenceCurrency },
      date,
    );
    const fxRateDiff = newFxRate.minus(fxRate);

    bookings[i] = {
      id: `fx-booking-${fxAccount.id}-${formatISODate(date)}`,
      date,
      accountId: fxAccount.id,
      value: balance.mul(fxRateDiff).negated(),
      unit: Unit.CURRENCY,
      currency: accountBook.referenceCurrency,
      cryptocurrency: null,
      symbol: null,
      tradeCurrency: null,
      description: "",
      transactionId: "transaction-fx-profit-loss",
      accountBookId: accountBook.id,
      transaction: {
        id: "transaction-fx-profit-loss",
        description: `Holding G/L as of ${formatISO(date, { representation: "date" })}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        bookings: [],
        accountBookId: accountBook.id,
      },
    };

    // TODO test this better, if new balance is set before calculating the FX booking value, it's wrong
    balance = await getBalanceCached(
      accountBook.id,
      fxAccount.id,
      fxAccountUnit,
      date,
    );
    fxRate = newFxRate;
  }

  return bookings;
}

export async function completeTransaction(
  referenceCurrency: string,
  transaction: TransactionWithBookings,
): Promise<Decimal> {
  const values = new Array<Decimal>(transaction.bookings.length);
  for (let i = 0; i < transaction.bookings.length; i++) {
    const b = transaction.bookings[i];
    values[i] = await convert(
      b.value,
      b.unit === Unit.CURRENCY
        ? { unit: Unit.CURRENCY, currency: b.currency! }
        : b.unit === Unit.CRYPTOCURRENCY
          ? {
              unit: Unit.CRYPTOCURRENCY,
              cryptocurrency: b.cryptocurrency!,
            }
          : {
              unit: Unit.SECURITY,
              symbol: b.symbol!,
              tradeCurrency: b.tradeCurrency!,
            },
      { unit: Unit.CURRENCY, currency: referenceCurrency },
      b.date,
    );
  }

  const bookingsSum = sum(values);

  return bookingsSum.negated();
}

export const TRANSACTION_GAIN_LOSS_ACCOUNT_ID = "transaction-gain-loss";

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
  fromDate: Date,
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

        // TODO how can we query for FX transactions only?
      ],
    },
    include: {
      bookings: {
        orderBy: { date: "asc" },
      },
    },
  });

  const bookings = new Array<BookingWithTransaction>(transactions.length);
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    bookings[i] = await generateTransactionGainLossBooking(
      accountBook.id,
      accountBook.referenceCurrency,
      t,
    );
  }
  return (
    bookings
      // filter this out earlier to improve performance
      .filter((b) => !b.value.isZero())
      .toSorted((a, b) => differenceInDays(b.date, a.date))
      .toReversed()
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

export function generateHoldingGainLossAccount(account: Account): Account {
  return {
    id: `holding-gain-loss-${account.id}`,
    type: AccountType.EQUITY,
    equityAccountSubtype: EquityAccountSubtype.GAIN_LOSS,
    name: `${account.unit === Unit.CURRENCY ? "FX" : account.unit === Unit.CRYPTOCURRENCY ? "Crypto" : "Security"} Holding Gain/Loss for ${account.name}`,
    groupId: `${account.unit === Unit.CURRENCY ? "fx" : account.unit === Unit.CRYPTOCURRENCY ? "crypto" : "security"}-${account.currency || account.cryptocurrency || account.symbol}-accounts`,
    unit: null,
    currency: null,
    cryptocurrency: null,
    symbol: null,
    tradeCurrency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: account.accountBookId,
    isActive: true,
  };
}

export async function getIncomeData(
  accountBook: AccountBook,
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  fromDate: Date,
  toDate: Date,
): Promise<IncomeData> {
  const equityAccounts = accounts.filter((a) => a.type === AccountType.EQUITY);

  const equityRootGroup = accountGroups.find(
    (g) => g.type === AccountType.EQUITY && !g.parentGroupId,
  )!;

  const investmentGainLossGroup: AccountGroup = {
    id: "investment-holding-gain-loss",
    name: "Investment Holding Gain/Loss",
    type: AccountType.EQUITY,
    parentGroupId: equityRootGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: accountBook.id,
    isActive: true,
    sortOrder: Infinity,
  };

  const fxHoldingGainLossGroup: AccountGroup = {
    id: "fx-holding-gain-loss",
    name: "FX Holding Gain/Loss",
    type: AccountType.EQUITY,
    parentGroupId: investmentGainLossGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: accountBook.id,
    isActive: true,
    sortOrder: Infinity,
  };

  const cryptoHoldingGainLossGroup: AccountGroup = {
    id: "crypto-holding-gain-loss",
    name: "Crypto Holding Gain/Loss",
    type: AccountType.EQUITY,
    parentGroupId: investmentGainLossGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: accountBook.id,
    isActive: true,
    sortOrder: Infinity,
  };

  const securityHoldingGainLossGroup: AccountGroup = {
    id: "security-holding-gain-loss",
    name: "Security Holding Gain/Loss",
    type: AccountType.EQUITY,
    parentGroupId: investmentGainLossGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: accountBook.id,
    isActive: true,
    sortOrder: Infinity,
  };

  const nonRefCurrencyAccounts = accounts.filter(
    (a) =>
      ([AccountType.ASSET, AccountType.LIABILITY] as AccountType[]).includes(
        a.type,
      ) &&
      (a.unit !== Unit.CURRENCY ||
        a.currency !== accountBook.referenceCurrency),
  );

  const holdingGainLossAccounts = new Array<AccountWithBookings>(
    nonRefCurrencyAccounts.length,
  );

  const groupsByUnit: Record<string, AccountGroup> = {};

  for (let i = 0; i < nonRefCurrencyAccounts.length; i++) {
    const a = nonRefCurrencyAccounts[i];

    const unitKey = `${a.unit}-${a.currency || a.cryptocurrency || a.symbol}`;
    if (!groupsByUnit[unitKey]) {
      groupsByUnit[unitKey] =
        a.unit === Unit.CURRENCY
          ? {
              id: `fx-${a.currency}-accounts`,
              name: `${a.currency}`,
              type: AccountType.EQUITY,
              parentGroupId: fxHoldingGainLossGroup.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              accountBookId: accountBook.id,
              isActive: true,
              sortOrder: 1,
            }
          : a.unit === Unit.CRYPTOCURRENCY
            ? {
                id: `crypto-${a.cryptocurrency}-accounts`,
                name: `${a.cryptocurrency}`,
                type: AccountType.EQUITY,
                parentGroupId: cryptoHoldingGainLossGroup.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                accountBookId: accountBook.id,
                isActive: true,
                sortOrder: 1,
              }
            : {
                id: `security-${a.symbol}-accounts`,
                name: `${a.symbol}`,
                type: AccountType.EQUITY,
                parentGroupId: securityHoldingGainLossGroup.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                accountBookId: accountBook.id,
                isActive: true,
                sortOrder: 1,
              };
    }

    holdingGainLossAccounts[i] = {
      ...generateHoldingGainLossAccount(a),
      bookings: await generateHoldingBookingsForAccount(
        accountBook,
        a,
        fromDate,
        toDate,
      ),
    };
  }

  const transactionGainLossAccount: AccountWithBookings = {
    ...generateTransactionGainLossAccount(equityRootGroup),
    bookings: await generateTransactionGainLossBookings(
      accountBook,
      fromDate,
      toDate,
    ),
  };

  const allEquityAccounts = equityAccounts
    .concat(holdingGainLossAccounts)
    .concat(transactionGainLossAccount);
  const valueByAccountIdEntries = new Array<[string, Decimal]>(
    allEquityAccounts.length,
  );

  for (let i = 0; i < allEquityAccounts.length; i++) {
    const a = allEquityAccounts[i];

    const cacheKey = `account-book:${accountBook.id}:account:${a.id}:income:monthly`;
    if (isSameMonth(fromDate, toDate) && fromDate.getDate() === 1) {
      const [cacheEntry] = (await redis.exists(cacheKey))
        ? await redis.ts.RANGE(cacheKey, fromDate, fromDate, { COUNT: 1 })
        : [];
      if (cacheEntry) {
        valueByAccountIdEntries[i] = [
          a.id,
          new Decimal(cacheEntry.value),
        ] as const;
        continue;
      }
    }

    const values = new Array<Decimal>(a.bookings.length);
    for (let j = 0; j < a.bookings.length; j++) {
      const b = a.bookings[j];
      values[j] = await convert(
        b.value,
        b.unit === Unit.CURRENCY
          ? { unit: Unit.CURRENCY, currency: b.currency! }
          : b.unit === Unit.CRYPTOCURRENCY
            ? {
                unit: Unit.CRYPTOCURRENCY,
                cryptocurrency: b.cryptocurrency!,
              }
            : {
                unit: Unit.SECURITY,
                symbol: b.symbol!,
                tradeCurrency: b.tradeCurrency!,
              },
        { unit: Unit.CURRENCY, currency: accountBook.referenceCurrency },
        b.date,
      );
    }

    const value = sum(values).negated();
    valueByAccountIdEntries[i] = [a.id, value] as const;

    if (isSameMonth(fromDate, toDate) && fromDate.getDate() === 1) {
      await redis.ts.add(cacheKey, fromDate, value.toNumber());
    }
  }

  return {
    virtualAccounts: holdingGainLossAccounts.concat(transactionGainLossAccount),
    virtualAccountGroups: [
      investmentGainLossGroup,
      fxHoldingGainLossGroup,
      cryptoHoldingGainLossGroup,
      securityHoldingGainLossGroup,
      ...Object.values(groupsByUnit),
    ],
    valueByAccountId: new Map<string, Decimal>(valueByAccountIdEntries),
  };
}
