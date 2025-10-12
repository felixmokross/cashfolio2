import type { Account, AccountGroup, Prisma } from "~/.prisma-client/client";

export type AccountOption = Pick<
  Account,
  "id" | "name" | "groupId" | "unit" | "currency" | "cryptocurrency" | "symbol"
> & {
  groupPath: string;
};

export type AccountGroupOption = Pick<
  AccountGroup,
  "id" | "name" | "parentGroupId" | "type"
> & {
  path: string;
};

export type AccountsNode = AccountGroupNode | AccountNode;

type BaseAccountsNode = {
  nodeType: "accountGroup" | "account";
  balance: Prisma.Decimal;
  children: AccountsNode[];
};
export type AccountGroupNode = BaseAccountsNode &
  AccountGroup & {
    nodeType: "accountGroup";
  };
export type AccountNode = BaseAccountsNode &
  Account & {
    nodeType: "account";
    balanceInOriginalCurrency: Prisma.Decimal;
  };
