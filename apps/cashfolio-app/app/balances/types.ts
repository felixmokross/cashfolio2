import type { Decimal } from "@prisma/client/runtime/library";
import type { Account } from "~/.prisma-client/client";
import type { AccountsNode } from "~/account-groups/accounts-tree";

export type BalancesAccountsNode = AccountsNode<
  Account,
  {
    balance: Decimal;
    balanceInOriginalCurrency?: Decimal;
  }
>;
