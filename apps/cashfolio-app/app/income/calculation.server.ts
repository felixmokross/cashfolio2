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
import { sum } from "~/utils.server";
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
import {
  getAccountUnitInfo,
  getCurrencyUnitInfo,
  getUnitInfo,
} from "~/units/functions";
import invariant from "tiny-invariant";
import {
  generateTransactionGainLossAccount,
  generateTransactionGainLossBookings,
  isTransactionGainLossAccount,
  TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
} from "./transaction-gain-loss.server";
import {
  generateHoldingBookingsForAccount,
  generateHoldingGainLossAccount,
} from "./holding-gain-loss.server";

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

  const netIncomeNode = { ...equityRootNode, name: "Net Income" };

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

  return withIncomeData(netIncomeNode);
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
              parentGroupId:
                accountBook.fxHoldingGainLossAccountGroupId ??
                fxHoldingGainLossGroup.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              accountBookId: accountBook.id,
              isActive: true,
              sortOrder: null,
            }
          : a.unit === Unit.CRYPTOCURRENCY
            ? {
                id: `crypto-${a.cryptocurrency}-accounts`,
                name: `${a.cryptocurrency}`,
                type: AccountType.EQUITY,
                parentGroupId:
                  accountBook.cryptoHoldingGainLossAccountGroupId ??
                  cryptoHoldingGainLossGroup.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                accountBookId: accountBook.id,
                isActive: true,
                sortOrder: null,
              }
            : {
                id: `security-${a.symbol}-accounts`,
                name: `${a.symbol}`,
                type: AccountType.EQUITY,
                parentGroupId:
                  accountBook.securityHoldingGainLossAccountGroupId ??
                  securityHoldingGainLossGroup.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                accountBookId: accountBook.id,
                isActive: true,
                sortOrder: null,
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
    if (canCacheAccountAndPeriod(a.id, fromDate, toDate)) {
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
        getUnitInfo(b),
        getCurrencyUnitInfo(accountBook.referenceCurrency),
        b.date,
      );
    }

    const value = sum(values).negated();
    valueByAccountIdEntries[i] = [a.id, value] as const;

    if (canCacheAccountAndPeriod(a.id, fromDate, toDate)) {
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

function canCacheAccountAndPeriod(
  accountId: string,
  fromDate: Date,
  toDate: Date,
) {
  return (
    // transaction and holding G/L accounts are not cached / would require more complex cache purging
    !isTransactionGainLossAccount(accountId) &&
    !isHoldingGainLossAccount(accountId) &&
    isMonthPeriod(fromDate, toDate)
  );
}

function isMonthPeriod(fromDate: Date, toDate: Date) {
  // Only checking fromDate – toDate might not be at month end if it is the MTD period
  return isSameMonth(fromDate, toDate) && fromDate.getDate() === 1;
}

function isHoldingGainLossAccount(accountId: string) {
  return accountId.startsWith("holding-gain-loss-");
}
