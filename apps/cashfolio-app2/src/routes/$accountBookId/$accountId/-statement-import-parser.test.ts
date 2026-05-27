import { describe, expect, test } from "vitest";
import { Unit } from "@/.prisma-client/enums";
import {
  DEFAULT_STATEMENT_IMPORT_CSV_FORMAT,
  parseStatementImportCsv,
} from "./-statement-import";
import { currentAccount } from "./-statement-import-test-fixtures";

describe("statement import CSV parser", () => {
  test("parses strict CSV with quoted descriptions", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description",
        '2026-02-03,100.25,92.50,EUR,1.083784,"Transfer, incoming"',
      ].join("\n"),
    });

    expect(result.errors).toEqual([]);
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]).toMatchObject({
      ignored: false,
      date: "2026-02-03T00:00:00.000Z",
      amount: 100.25,
      originalAmount: 92.5,
      originalCurrency: "EUR",
      counterAccountId: "",
      description: "Transfer, incoming",
      transaction: {
        description: "Transfer, incoming",
        bookings: [
          {
            accountId: "asset-1",
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: 100.25,
          },
          {
            accountId: "",
            unit: Unit.CURRENCY,
            currency: "EUR",
            value: -92.5,
          },
        ],
      },
    });
  });

  test("parses semicolon-delimited CSV with quoted descriptions", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "Booking Date;Booked Amount;Source Amount;Source Currency;FX Rate;Memo",
        '2026-02-03;100.25;92.50;EUR;1.083784;"Transfer; incoming"',
      ].join("\n"),
    });

    expect(result.errors).toEqual([]);
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]).toMatchObject({
      amount: 100.25,
      originalAmount: 92.5,
      originalCurrency: "EUR",
      description: "Transfer; incoming",
    });
  });

  test("parses arbitrary header names by column order", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "Booked On,Value,Foreign Value,Foreign Ccy,Rate,Text",
        "2026-02-03,100.25,92.50,EUR,1.083784,Transfer",
      ].join("\n"),
    });

    expect(result.errors).toEqual([]);
    expect(result.drafts[0]).toMatchObject({
      date: "2026-02-03T00:00:00.000Z",
      amount: 100.25,
      originalAmount: 92.5,
      originalCurrency: "EUR",
      description: "Transfer",
    });
  });

  test("uses the default CSV format when no format is provided", () => {
    const text = [
      "date,amount,original amount,original currency,exchange rate,description",
      "2026-02-03,100.25,92.50,EUR,1.083784,Transfer",
    ].join("\n");

    const implicitDefault = parseStatementImportCsv({
      currentAccount,
      text,
    });
    const explicitDefault = parseStatementImportCsv({
      currentAccount,
      format: DEFAULT_STATEMENT_IMPORT_CSV_FORMAT,
      text,
    });

    expect(implicitDefault.errors).toEqual([]);
    expect(explicitDefault.errors).toEqual([]);
    expect(explicitDefault.drafts[0]).toMatchObject({
      date: implicitDefault.drafts[0]?.date,
      amount: implicitDefault.drafts[0]?.amount,
      originalAmount: implicitDefault.drafts[0]?.originalAmount,
      originalCurrency: implicitDefault.drafts[0]?.originalCurrency,
      description: implicitDefault.drafts[0]?.description,
      transaction: implicitDefault.drafts[0]?.transaction,
    });
  });

  test("ignores extra trailing columns", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description,balance,unused",
        "2026-02-03,100.25,92.50,EUR,1.083784,Transfer,5000,ignored",
      ].join("\n"),
    });

    expect(result.errors).toEqual([]);
    expect(result.drafts[0]).toMatchObject({
      amount: 100.25,
      originalAmount: 92.5,
      originalCurrency: "EUR",
      description: "Transfer",
    });
  });

  test("ignores exchange rate values", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "date;amount;original amount;original currency;exchange rate;description",
        "2026-02-03;100.25;92.50;EUR;not a rate;Transfer",
        "2026-02-04;80.00;75.00;EUR;1,25;Payment",
      ].join("\n"),
    });

    expect(result.errors).toEqual([]);
    expect(result.drafts[0]).not.toHaveProperty("exchangeRate");
    expect(result.drafts[0]).toMatchObject({
      amount: 100.25,
      originalAmount: 92.5,
      originalCurrency: "EUR",
      description: "Transfer",
    });
    expect(result.drafts[1]).toMatchObject({
      amount: 80,
      originalAmount: 75,
      originalCurrency: "EUR",
      description: "Payment",
    });
  });

  test("rejects rows with extra columns not declared by the header", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description",
        "2026-02-03,100.25,92.50,EUR,1,25,Transfer",
      ].join("\n"),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors).toContain(
      "Row 2: CSV row has more columns than the header row; check for unquoted delimiters in values.",
    );
  });

  test("rejects shifted rows when extra header columns hide the column count mismatch", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description,balance",
        "2026-02-03,100.25,92.50,EUR,1,25,Transfer",
      ].join("\n"),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors).toContain(
      "Row 2: CSV row appears to have an unquoted decimal comma before the description column; use semicolon delimiter or quote the value.",
    );
  });

  test("allows blank original amount and original currency", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description",
        "2026-02-03,100.25,,,,Transfer",
      ].join("\n"),
    });

    expect(result.errors).toEqual([]);
    expect(result.drafts[0]).toMatchObject({
      amount: 100.25,
      originalAmount: undefined,
      originalCurrency: undefined,
      transaction: {
        bookings: [
          {
            accountId: "asset-1",
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: 100.25,
          },
          {
            accountId: "",
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: -100.25,
          },
        ],
      },
    });
  });

  test("requires original amount and original currency to be provided together", () => {
    const missingCurrency = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description",
        "2026-02-03,100.25,92.50,,,Transfer",
      ].join("\n"),
    });
    const missingAmount = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description",
        "2026-02-03,100.25,,EUR,,Transfer",
      ].join("\n"),
    });

    expect(missingCurrency.errors).toContain(
      "Row 2: original currency is required when original amount is set.",
    );
    expect(missingAmount.errors).toContain(
      "Row 2: original amount is required when original currency is set.",
    );
  });

  test("rejects CSVs with fewer than six columns", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      format: DEFAULT_STATEMENT_IMPORT_CSV_FORMAT,
      text: ["date,amount,original amount", "2026-02-03,100.25,92.50"].join(
        "\n",
      ),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors[0]).toBe(
      "CSV must include at least 6 columns in this order: date, amount, original amount, original currency, exchange rate, description",
    );
  });

  test("rejects headerless CSVs instead of dropping the first data row", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "2026-02-03,100.25,92.50,EUR,1.083784,First transaction",
        "2026-02-04,80.00,75.00,EUR,ignored,Second transaction",
      ].join("\n"),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors).toContain(
      "CSV must include a header row before transaction rows.",
    );
  });

  test("rejects headerless CSVs when the first transaction row is invalid", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "2026-02-03,100.25,92.50,eur,1.083784,First transaction",
        "2026-02-04,80.00,75.00,EUR,ignored,Second transaction",
      ].join("\n"),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors).toContain(
      "CSV must include a header row before transaction rows.",
    );
  });

  test("rejects headerless CSVs when the first row has localized date and amount values", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "03.02.2026;100,25;92,50;EUR;ignored;First transaction",
        "2026-02-04;80.00;75.00;EUR;ignored;Second transaction",
      ].join("\n"),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors).toContain(
      "CSV must include a header row before transaction rows.",
    );
  });

  test("rejects invalid dates and numeric fields", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: [
        "date,amount,original amount,original currency,exchange rate,description",
        "03.02.2026,100,00.50,eur,0,Transfer",
      ].join("\n"),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Row 2: date must be ISO yyyy-mm-dd.",
        "Row 2: original amount must be a dot-decimal number.",
        "Row 2: original currency must be a 3-letter uppercase code.",
      ]),
    );
  });
});
