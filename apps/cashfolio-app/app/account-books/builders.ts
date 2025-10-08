import { createId } from "@paralleldrive/cuid2";
import type { AccountBook } from "~/.prisma-client/client";

export function buildAccountBook(
  values: Partial<AccountBook> = {},
): AccountBook {
  return {
    id: createId(),
    name: "Test Account Book",
    referenceCurrency: "CHF",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...values,
  };
}
