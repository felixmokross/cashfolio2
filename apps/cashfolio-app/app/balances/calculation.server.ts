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

  const [assets, liabilities] = await Promise.all([
    getBalances(accountsTree.ASSET!, date),
    getBalances(accountsTree.LIABILITY!, date),
  ]);
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
    const children = await Promise.all(
      node.children.map((c) => getBalances(c, date)),
    );
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
        : { unit: Unit.CRYPTOCURRENCY, cryptocurrency: node.cryptocurrency! },
      { unit: Unit.CURRENCY, currency: refCurrency },
      date,
    ),
  };
}
