import { createId } from "@paralleldrive/cuid2";
import type { AccountBook } from "~/.prisma-client/client";

export function buildAccountBook(
  values: Partial<AccountBook> = {},
): AccountBook {
  return {
    id: createId(),
    name: "Test Account Book",
    referenceCurrency: "CHF",
    securityHoldingGainLossAccountGroupId: null,
    cryptoHoldingGainLossAccountGroupId: null,
    fxHoldingGainLossAccountGroupId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...values,
  };
}
