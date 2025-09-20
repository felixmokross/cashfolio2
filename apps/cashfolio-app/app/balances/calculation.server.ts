import {
  getAccountsTree,
  type AccountsNode,
} from "~/account-groups/accounts-tree";
import type { BalancesAccountsNode } from "./types";
import { sum } from "~/utils";
import { refCurrency } from "~/config";
import { convert } from "~/fx.server";
import { Unit, type AccountGroup } from "@prisma/client";
import type { AccountWithBookings } from "~/accounts/types";

export async function getBalanceSheet(
  accounts: AccountWithBookings[],
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
  node: AccountsNode<AccountWithBookings>,
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

  const balanceInOriginalCurrency = sum(node.bookings.map((b) => b.value));

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
