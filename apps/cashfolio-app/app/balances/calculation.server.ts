import {
  getAccountsTree,
  type AccountsNode,
} from "~/account-groups/accounts-tree";
import type { BalancesAccountsNode } from "./types";
import { sum } from "~/utils";
import { convert } from "~/fx.server";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import { Unit } from "~/.prisma-client/enums";
import type {
  Account,
  AccountBook,
  AccountGroup,
} from "~/.prisma-client/client";
import type { AccountGroupNode } from "~/types";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "~/prisma.server";

export async function getBalanceSheet(
  accountBook: AccountBook,
  accounts: Account[],
  accountGroups: AccountGroup[],
  date: Date,
) {
  const accountsTree = getAccountsTree(accounts, accountGroups);

  let assets = (await getBalances(
    accountBook,
    accountsTree.ASSET!,
    date,
  )) as BalancesAccountsNode & AccountGroupNode;

  // TODO verify, improve
  const transferClearingBalance = sum(
    await Promise.all(
      (
        await prisma.transaction.findMany({
          where: {
            accountBookId: accountBook.id,
            AND: [
              { bookings: { some: { date: { lte: date } } } },
              { bookings: { some: { date: { gt: date } } } },
            ],
          },
          include: { bookings: { where: { date: { gt: date } } } },
        })
      ).map(async (t) =>
        sum(
          await Promise.all(
            t.bookings.map((b) =>
              convert(
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
                {
                  unit: Unit.CURRENCY,
                  currency: accountBook.referenceCurrency,
                },
                b.date,
              ),
            ),
          ),
        ),
      ),
    ),
  );

  assets = {
    ...assets,
    balance: assets.balance.plus(transferClearingBalance),
    children: [
      ...assets.children,
      {
        nodeType: "account",
        id: "transfer-clearing",
        name: "Transfer Clearing",
        createdAt: new Date(),
        updatedAt: new Date(),
        groupId: assets.id,
        accountBookId: assets.accountBookId,
        unit: Unit.CURRENCY,
        currency: accountBook.referenceCurrency,
        balance: transferClearingBalance,
        balanceInOriginalCurrency: new Decimal(0),
        isActive: true,
        cryptocurrency: null,
        symbol: null,
        tradeCurrency: null,
        equityAccountSubtype: null,
        type: "ASSET",
        children: [],
      },
    ],
  };

  const liabilities = await getBalances(
    accountBook,
    accountsTree.LIABILITY!,
    date,
  );
  return {
    assets,
    liabilities,
    equity: assets.balance.plus(liabilities.balance),
  };
}

async function getBalances(
  accountBook: AccountBook,
  node: AccountsNode<Account>,
  date: Date,
): Promise<BalancesAccountsNode> {
  if (node.nodeType === "accountGroup") {
    const children: BalancesAccountsNode[] = [];
    for (const child of node.children) {
      const balances = await getBalances(accountBook, child, date);
      if (!balances.balance.isZero()) {
        children.push(balances);
      }
    }
    return {
      ...node,
      children,
      balanceInOriginalCurrency: undefined,
      balance: sum(children.map((n) => n.balance)),
    };
  }

  const balanceInOriginalCurrency = await getBalanceCached(
    accountBook.id,
    node.id,
    node.unit === Unit.CURRENCY
      ? {
          unit: Unit.CURRENCY,
          currency: node.currency!,
        }
      : node.unit === Unit.CRYPTOCURRENCY
        ? {
            unit: Unit.CRYPTOCURRENCY,
            cryptocurrency: node.cryptocurrency!,
          }
        : {
            unit: Unit.SECURITY,
            symbol: node.symbol!,
            tradeCurrency: node.tradeCurrency!,
          },
    date,
  );

  return {
    ...node,
    balanceInOriginalCurrency:
      node.currency !== accountBook.referenceCurrency
        ? balanceInOriginalCurrency
        : undefined,
    balance: await convert(
      balanceInOriginalCurrency,
      node.unit === Unit.CURRENCY
        ? { unit: Unit.CURRENCY, currency: node.currency! }
        : node.unit === Unit.CRYPTOCURRENCY
          ? { unit: Unit.CRYPTOCURRENCY, cryptocurrency: node.cryptocurrency! }
          : {
              unit: Unit.SECURITY,
              symbol: node.symbol!,
              tradeCurrency: node.tradeCurrency!,
            },
      { unit: Unit.CURRENCY, currency: accountBook.referenceCurrency },
      date,
    ),
  };
}
