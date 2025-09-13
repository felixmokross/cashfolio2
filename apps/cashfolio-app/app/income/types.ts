import type { Account, AccountGroup, Prisma } from "@prisma/client";
import type { AccountsNode } from "~/account-groups/accounts-tree";

export type IncomeData = {
  virtualAccounts: Account[];
  virtualAccountGroups: AccountGroup[];
  valueByAccountId: Map<string, Prisma.Decimal>;
};

export type IncomeAccountsNode = AccountsNode<
  Account,
  { value: Prisma.Decimal }
>;
