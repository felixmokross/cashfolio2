import { describe, expect, test } from "vitest";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
} from "../.prisma-client/enums";
import {
  transformAccountValues,
  validateStatementImportCsvFormatFormValue,
} from "./edit-account-modal";

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
        statementImportCsvFormat: JSON.stringify({
          hasHeader: true,
          delimitersToGuess: [","],
          columns: ["date", "amount", "description"],
        }),
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
      statementImportCsvFormat: null,
      type: AccountType.EQUITY,
      equityAccountSubtype: EquityAccountSubtype.EXPENSE,
      openingBalance: null,
    });
  });

  test("keeps selected unit identity fields for non-equity accounts", () => {
    const statementImportCsvFormat = {
      hasHeader: true,
      delimitersToGuess: [";"],
      columns: ["date", "amount", "description"],
    };

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
        statementImportCsvFormat: JSON.stringify(statementImportCsvFormat),
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
      statementImportCsvFormat,
      type: AccountType.ASSET,
    });
  });

  test("transforms blank statement import format to null", () => {
    expect(
      transformAccountValues({
        name: "Cash",
        typeDescriptor: AccountType.ASSET,
        unit: Unit.CURRENCY,
        currency: "CHF",
        statementImportCsvFormat: "   ",
      }),
    ).toMatchObject({
      statementImportCsvFormat: null,
    });
  });

  test("validates statement import format JSON", () => {
    expect(
      validateStatementImportCsvFormatFormValue("{not-json", AccountType.ASSET),
    ).toBe("Statement import CSV format must be valid JSON.");
    expect(
      validateStatementImportCsvFormatFormValue(
        JSON.stringify({
          hasHeader: true,
          delimitersToGuess: [","],
          columns: ["date", "amount", "description"],
        }),
        AccountType.ASSET,
      ),
    ).toBeNull();
  });
});
