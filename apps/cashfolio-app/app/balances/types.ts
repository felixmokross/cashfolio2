import type { Account, Prisma } from "@prisma/client";
import type { AccountsNode } from "~/account-groups/accounts-tree";

export type BalancesAccountsNode = AccountsNode<
  Account,
  {
    balance: Prisma.Decimal;
    balanceInOriginalCurrency?: Prisma.Decimal;
  }
>;
