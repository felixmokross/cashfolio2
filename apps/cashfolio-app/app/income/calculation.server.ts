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

export async function getIncomeStatement(
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  transactions: TransactionWithBookings[],
  startDate: Date,
  endDate: Date,
) {
  const incomeData = await getIncomeData(
    accounts,
    accountGroups,
    transactions,
    startDate,
    endDate,
  );

  const equityRootNode = getAccountsTree(
    (accounts as Account[])
      .concat(incomeData.virtualAccounts)
      .filter((a) => !incomeData.valueByAccountId.get(a.id)?.isZero()),
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

export async function generateFxBookingsForFxAccount(
  fxAccount: AccountWithBookings,
  startDate: Date,
  endDate: Date,
): Promise<Booking[]> {
  const initialDate = subDays(startDate, 1);

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
  if (!balance) {
    throw new Error("Initial balance not found");
  }

  let fxRate = await getExchangeRate(
    fxAccountUnit,
    { unit: Unit.CURRENCY, currency: refCurrency },
    initialDate,
  );

  const bookings = new Array<Booking>(fxAccount.bookings.length + 1);

  for (let i = 0; i < bookings.length; i++) {
    const date = fxAccount.bookings[i]?.date ?? endDate;
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

export async function completeFxTransaction(
  transaction: TransactionWithBookings,
): Promise<Prisma.Decimal> {
  const values = new Array(transaction.bookings.length);
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

export async function getIncomeData(
  accounts: AccountWithBookings[],
  accountGroups: AccountGroup[],
  transactions: TransactionWithBookings[],
  startDate: Date,
  endDate: Date,
): Promise<IncomeData> {
  const equityAccounts = accounts.filter((a) => a.type === AccountType.EQUITY);

  const equityRootGroup = accountGroups.find(
    (g) => g.type === AccountType.EQUITY && !g.parentGroupId,
  )!;

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
  for (let i = 0; i < nonRefCurrencyAccounts.length; i++) {
    const a = nonRefCurrencyAccounts[i];
    fxAccounts[i] = {
      id: `fx-holding-${a.id}`,
      type: AccountType.EQUITY,
      equityAccountSubtype: EquityAccountSubtype.GAIN_LOSS,
      bookings: await generateFxBookingsForFxAccount(a, startDate, endDate),
      name: `FX Holding Gain/Loss for ${a.name}`,
      slug: `fx-holding-${a.slug}`,
      groupId: equityRootGroup.id,
      unit: null,
      currency: null,
      cryptocurrency: null,
      symbol: null,
      tradeCurrency: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const bookings = new Array<Booking>(transactions.length);
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    bookings[i] = {
      id: `fx-conversion-${t.id}`,
      date: max(t.bookings.map((b) => b.date)),
      unit: Unit.CURRENCY,
      currency: refCurrency,
      cryptocurrency: null,
      symbol: null,
      tradeCurrency: null,
      value: await completeFxTransaction(t),
      accountId: "fx-conversion",
      description: `FX Conversion P/L for transaction ${t.description}`,
      transactionId: t.id,
    };
  }

  const fxTransferAccount: AccountWithBookings = {
    id: "fx-conversion",
    name: "FX Conversion Gain/Loss",
    slug: "fx-conversion",
    groupId: equityRootGroup.id,
    type: AccountType.EQUITY,
    equityAccountSubtype: EquityAccountSubtype.GAIN_LOSS,
    bookings,
    createdAt: new Date(),
    updatedAt: new Date(),
    unit: null,
    currency: null,
    cryptocurrency: null,
    symbol: null,
    tradeCurrency: null,
  };

  const allEquityAccounts = equityAccounts
    .concat(fxAccounts)
    .concat(fxTransferAccount);
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
    virtualAccounts: fxAccounts.concat(fxTransferAccount),
    virtualAccountGroups: [],
    valueByAccountId: new Map<string, Prisma.Decimal>(valueByAccountIdEntries),
  };
}
