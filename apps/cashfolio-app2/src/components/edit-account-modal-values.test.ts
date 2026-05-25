import { describe, expect, test } from "vitest";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
} from "../.prisma-client/enums";
import { transformAccountValues } from "./edit-account-modal";

describe("transformAccountValues", () => {
  test("strips hidden unit identity fields for equity accounts", () => {
    expect(
      transformAccountValues({
        name: "Groceries",
        typeDescriptor: `${AccountType.EQUITY}-${EquityAccountSubtype.EXPENSE}`,
        groupId: "group-expenses",
        sortOrder: 1,
        unit: Unit.CURRENCY,
        currency: "CHF",
        cryptocurrency: "BTC",
        symbol: "AAPL",
        tradeCurrency: "USD",
      }),
    ).toEqual({
      name: "Groceries",
      typeDescriptor: `${AccountType.EQUITY}-${EquityAccountSubtype.EXPENSE}`,
      groupId: "group-expenses",
      sortOrder: 1,
      unit: undefined,
      currency: undefined,
      cryptocurrency: undefined,
      symbol: undefined,
      tradeCurrency: undefined,
      type: AccountType.EQUITY,
      equityAccountSubtype: EquityAccountSubtype.EXPENSE,
      openingBalance: null,
    });
  });

  test("keeps selected unit identity fields for non-equity accounts", () => {
    expect(
      transformAccountValues({
        name: "Brokerage",
        typeDescriptor: AccountType.ASSET,
        groupId: "group-assets",
        sortOrder: 2,
        openingBalance: "125.5",
        unit: Unit.SECURITY,
        symbol: "AAPL",
        tradeCurrency: "USD",
      }),
    ).toEqual({
      name: "Brokerage",
      typeDescriptor: AccountType.ASSET,
      groupId: "group-assets",
      sortOrder: 2,
      openingBalance: 125.5,
      unit: Unit.SECURITY,
      symbol: "AAPL",
      tradeCurrency: "USD",
      type: AccountType.ASSET,
    });
  });
});
