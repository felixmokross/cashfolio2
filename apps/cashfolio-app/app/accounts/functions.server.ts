import { prisma } from "~/prisma.server";
import { TRANSFER_CLEARING_ACCOUNT_ID } from "./constants";
import { AccountType, Unit } from "~/.prisma-client/enums";
import type {
  Account,
  AccountBook,
  AccountGroup,
} from "~/.prisma-client/client";
import invariant from "tiny-invariant";

export async function getAccounts(
  accountBook: AccountBook,
  groups: AccountGroup[],
  {
    isActive,
    includeVirtualAccounts,
  }: { isActive?: boolean; includeVirtualAccounts?: boolean } = {},
) {
  includeVirtualAccounts = includeVirtualAccounts ?? true;

  let accounts = await prisma.account.findMany({
    where: { accountBookId: accountBook.id, isActive },
    orderBy: { name: "asc" },
  });

  if (includeVirtualAccounts) {
    accounts = accounts.concat(
      // TODO add other virtual accounts
      generateTransferClearingAccount(accountBook, groups),
    );
  }

  return accounts;
}

function generateTransferClearingAccount(
  accountBook: AccountBook,
  groups: AccountGroup[],
): Account {
  const group = groups.find(
    (g) => g.type === AccountType.ASSET && !g.parentGroupId,
  );
  invariant(group, "No ASSET root account group found");

  return {
    // TODO create base utilities for virtual account creation
    id: TRANSFER_CLEARING_ACCOUNT_ID,
    name: "Transfer Clearing",
    type: group.type,
    unit: Unit.CURRENCY,
    accountBookId: accountBook.id,
    groupId: group.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    cryptocurrency: null,
    currency: accountBook.referenceCurrency,
    symbol: null,
    tradeCurrency: null,
    equityAccountSubtype: null,
    isActive: true,
  };
}
