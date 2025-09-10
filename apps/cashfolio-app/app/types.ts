import type {
  Account,
  AccountGroup,
  Booking,
  Prisma,
  Transaction,
} from "@prisma/client";

export type AccountOption = Pick<Account, "id" | "name" | "groupId"> & {
  path: string;
};

export type AccountGroupOption = Pick<
  AccountGroup,
  "id" | "name" | "parentGroupId" | "type"
> & {
  path: string;
};

export type TransactionWithBookings = Transaction & {
  bookings: Booking[];
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
