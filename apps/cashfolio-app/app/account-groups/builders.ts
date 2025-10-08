import { createId } from "@paralleldrive/cuid2";
import type { AccountGroup } from "~/.prisma-client/client";
import { AccountType } from "~/.prisma-client/enums";

export function buildAccountGroup(
  values: Partial<AccountGroup> = {},
): AccountGroup {
  return {
    id: createId(),
    name: "My Account Group",
    parentGroupId: null,
    type: AccountType.ASSET,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountBookId: "account_book_1",
    isActive: true,
    sortOrder: 1,
    ...values,
  };
}
