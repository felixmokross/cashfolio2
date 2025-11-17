import type { Decimal } from "@prisma/client/runtime/library";
import type { Account, AccountGroup, Prisma } from "~/.prisma-client/client";
import type { AccountsNode } from "~/account-groups/accounts-tree";

export type Income = {
  incomeByAccountId: Map<string, Decimal>;
  accounts: Account[];
  accountGroups: AccountGroup[];
};

export type IncomeData = {
  virtualAccounts: Account[];
  virtualAccountGroups: AccountGroup[];
  valueByAccountId: Map<string, Prisma.Decimal>;
};

export type IncomeAccountsNode = AccountsNode<
  Account,
  { value: Prisma.Decimal }
>;
