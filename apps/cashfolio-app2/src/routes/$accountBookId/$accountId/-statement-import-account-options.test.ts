import { describe, expect, test } from "vitest";
import { AccountType, EquityAccountSubtype } from "@/.prisma-client/enums";
import { shouldIncludeStatementImportAccountOption } from "./-statement-import";

describe("statement import account options", () => {
  test("includes the archived current account in import account options", () => {
    const archivedCurrentAccount = {
      id: "asset-1",
      isActive: false,
      type: AccountType.ASSET,
      equityAccountSubtype: null,
    };
    const archivedOtherAccount = {
      ...archivedCurrentAccount,
      id: "asset-2",
    };
    const openingBalancesAccount = {
      ...archivedCurrentAccount,
      id: "opening-balances",
      isActive: true,
      type: AccountType.EQUITY,
      equityAccountSubtype: EquityAccountSubtype.OPENING_BALANCES,
    };

    expect(
      shouldIncludeStatementImportAccountOption(
        archivedCurrentAccount,
        "asset-1",
      ),
    ).toBe(true);
    expect(
      shouldIncludeStatementImportAccountOption(
        archivedOtherAccount,
        "asset-1",
      ),
    ).toBe(false);
    expect(
      shouldIncludeStatementImportAccountOption(
        openingBalancesAccount,
        "asset-1",
      ),
    ).toBe(false);
  });
});
