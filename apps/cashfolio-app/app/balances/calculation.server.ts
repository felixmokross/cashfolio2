import {
  getAccountsTree,
  type AccountsNode,
} from "~/account-groups/accounts-tree";
import type { BalancesAccountsNode } from "./types";
import { sum } from "~/utils";
import { refCurrency } from "~/config";
import { convert } from "~/fx.server";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import { Unit } from "~/.prisma-client/enums";
import type { Account, AccountGroup } from "~/.prisma-client/client";

export async function getBalanceSheet(
  accounts: Account[],
  accountGroups: AccountGroup[],
  date: Date,
) {
  const accountsTree = getAccountsTree(accounts, accountGroups);

  const assets = await getBalances(accountsTree.ASSET!, date);
  const liabilities = await getBalances(accountsTree.LIABILITY!, date);
  return {
    assets,
    liabilities,
    equity: assets.balance.plus(liabilities.balance),
  };
}

async function getBalances(
  node: AccountsNode<Account>,
  date: Date,
): Promise<BalancesAccountsNode> {
  if (node.nodeType === "accountGroup") {
    const children: BalancesAccountsNode[] = [];
    for (const child of node.children) {
      const balances = await getBalances(child, date);
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
      node.currency !== refCurrency ? balanceInOriginalCurrency : undefined,
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
      { unit: Unit.CURRENCY, currency: refCurrency },
      date,
    ),
  };
}
