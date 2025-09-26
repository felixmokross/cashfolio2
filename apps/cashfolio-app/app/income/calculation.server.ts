import {
  AccountType,
  EquityAccountSubtype,
  Prisma,
  Unit,
  type Account,
  type AccountGroup,
  type Booking,
} from "@prisma/client";
import { addDays, differenceInDays, formatISO, max, subDays } from "date-fns";
import type { AccountWithBookings } from "~/accounts/types";
import { refCurrency } from "~/config";
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

export async function getIncomeStatement(
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  transactions: TransactionWithBookings[],
  fromDate: Date,
  toDate: Date,
) {
  const incomeData = await getIncomeData(
    accounts,
    accountGroups,
    transactions,
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
        .filter((child) => !child.value.isZero());
      return { ...node, children, value: sum(children.map((c) => c.value)) };
    }

    return {
      ...node,
      value: incomeData.valueByAccountId.get(node.id) ?? new Prisma.Decimal(0),
    };
  }

  return withIncomeData(equityRootNode);
}

export async function generateFxBookingsForFxAccount(
  fxAccount: AccountWithBookings,
  fromDate: Date,
  toDate: Date,
): Promise<Booking[]> {
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
    { unit: Unit.CURRENCY, currency: refCurrency },
    initialDate,
  );

  const bookings = new Array<Booking>(fxAccount.bookings.length + 1);

  for (let i = 0; i < bookings.length; i++) {
    const date = fxAccount.bookings[i]?.date ?? toDate;
    const newFxRate = await getExchangeRate(
      fxAccountUnit,
      { unit: Unit.CURRENCY, currency: refCurrency },
      date,
    );
    const fxRateDiff = newFxRate.minus(fxRate);

    bookings[i] = {
      id: `fx-booking-${fxAccount.id}-${formatISODate(date)}`,
      date,
      accountId: fxAccount.id,
      value: balance.mul(fxRateDiff).negated(),
      unit: Unit.CURRENCY,
      currency: refCurrency,
      cryptocurrency: null,
      symbol: null,
      tradeCurrency: null,
      description: `FX P/L as of ${formatISO(date, { representation: "date" })}`,
      transactionId: "transaction-fx-profit-loss",
    };

    // TODO test this better, if new balance is set before calculating the FX booking value, it's wrong
    balance = await getBalanceCached(fxAccount.id, fxAccountUnit, date);
    fxRate = newFxRate;
  }

  return bookings;
}

export async function completeTransaction(
  transaction: TransactionWithBookings,
): Promise<Prisma.Decimal> {
  const values = new Array<Prisma.Decimal>(transaction.bookings.length);
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
      { unit: Unit.CURRENCY, currency: refCurrency },
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
    slug: "transaction-gain-loss",
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
  };
}

export async function generateTransactionGainLossBookings(
  transactions: TransactionWithBookings[],
) {
  const bookings = new Array<BookingWithTransaction>(transactions.length);
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    bookings[i] = {
      id: `transaction-gain-loss-${t.id}`,
      date: max(t.bookings.map((b) => b.date)),
      unit: Unit.CURRENCY,
      currency: refCurrency,
      cryptocurrency: null,
      symbol: null,
      tradeCurrency: null,
      value: await completeTransaction(t),
      accountId: TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
      description: `Transaction Gain/Loss for transaction ${t.description}`,
      transactionId: t.id,
      transaction: t,
    };
  }
  return (
    bookings
      // filter this out earlier to improve performance
      .filter((b) => !b.value.isZero())
  );
}

export async function getIncomeData(
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  transactions: TransactionWithBookings[],
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
    slug: "investment-holding-gain-loss",
    type: AccountType.EQUITY,
    parentGroupId: equityRootGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const fxHoldingGainLossGroup: AccountGroup = {
    id: "fx-holding-gain-loss",
    name: "FX Holding Gain/Loss",
    slug: "fx-holding-gain-loss",
    type: AccountType.EQUITY,
    parentGroupId: investmentGainLossGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const cryptoHoldingGainLossGroup: AccountGroup = {
    id: "crypto-holding-gain-loss",
    name: "Crypto Holding Gain/Loss",
    slug: "crypto-holding-gain-loss",
    type: AccountType.EQUITY,
    parentGroupId: investmentGainLossGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const securityHoldingGainLossGroup: AccountGroup = {
    id: "security-holding-gain-loss",
    name: "Security Holding Gain/Loss",
    slug: "security-holding-gain-loss",
    type: AccountType.EQUITY,
    parentGroupId: investmentGainLossGroup.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const nonRefCurrencyAccounts = accounts.filter(
    (a) =>
      ([AccountType.ASSET, AccountType.LIABILITY] as AccountType[]).includes(
        a.type,
      ) &&
      (a.unit !== Unit.CURRENCY || a.currency !== refCurrency),
  );

  const fxAccounts = new Array<AccountWithBookings>(
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
              slug: `fx-${a.currency}`,
              type: AccountType.EQUITY,
              parentGroupId: fxHoldingGainLossGroup.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : a.unit === Unit.CRYPTOCURRENCY
            ? {
                id: `crypto-${a.cryptocurrency}-accounts`,
                name: `${a.cryptocurrency}`,
                slug: `crypto-${a.cryptocurrency}`,
                type: AccountType.EQUITY,
                parentGroupId: cryptoHoldingGainLossGroup.id,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : {
                id: `security-${a.symbol}-accounts`,
                name: `${a.symbol}`,
                slug: `security-${a.symbol}`,
                type: AccountType.EQUITY,
                parentGroupId: securityHoldingGainLossGroup.id,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
    }

    fxAccounts[i] = {
      id: `fx-holding-${a.id}`,
      type: AccountType.EQUITY,
      equityAccountSubtype: EquityAccountSubtype.GAIN_LOSS,
      bookings: await generateFxBookingsForFxAccount(a, fromDate, toDate),
      name: `FX Holding Gain/Loss for ${a.name}`,
      slug: `fx-holding-${a.slug}`,
      groupId: groupsByUnit[unitKey].id,
      unit: null,
      currency: null,
      cryptocurrency: null,
      symbol: null,
      tradeCurrency: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const transactionGainLossAccount: AccountWithBookings = {
    ...generateTransactionGainLossAccount(equityRootGroup),
    bookings: await generateTransactionGainLossBookings(transactions),
  };

  const allEquityAccounts = equityAccounts
    .concat(fxAccounts)
    .concat(transactionGainLossAccount);
  const valueByAccountIdEntries = new Array<[string, Prisma.Decimal]>(
    allEquityAccounts.length,
  );

  for (let i = 0; i < allEquityAccounts.length; i++) {
    const a = allEquityAccounts[i];

    const values = new Array<Prisma.Decimal>(a.bookings.length);
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
        { unit: Unit.CURRENCY, currency: refCurrency },
        b.date,
      );
    }

    valueByAccountIdEntries[i] = [a.id, sum(values).negated()] as const;
  }

  return {
    virtualAccounts: fxAccounts.concat(transactionGainLossAccount),
    virtualAccountGroups: [
      investmentGainLossGroup,
      fxHoldingGainLossGroup,
      cryptoHoldingGainLossGroup,
      securityHoldingGainLossGroup,
      ...Object.values(groupsByUnit),
    ],
    valueByAccountId: new Map<string, Prisma.Decimal>(valueByAccountIdEntries),
  };
}
