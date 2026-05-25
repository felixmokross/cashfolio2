import { describe, expect, test } from "vitest";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
} from "@/.prisma-client/enums";
import type { AccountOption } from "@/components/edit-transaction-modal";
import {
  createStatementImportDraft,
  getStatementImportDraftStatus,
  parseStatementImportCsv,
  type StatementImportCsvRow,
} from "./-statement-import";

const currentAccount = {
  id: "asset-1",
  unit: Unit.CURRENCY,
  currency: "CHF",
  cryptocurrency: null,
  symbol: null,
  tradeCurrency: null,
};

const accountOptions: AccountOption[] = [
  {
    value: "asset-1",
    label: "Checking",
    unit: Unit.CURRENCY,
    currency: "CHF",
    type: AccountType.ASSET,
  },
  {
    value: "income-1",
    label: "Salary",
    unit: null,
    type: AccountType.EQUITY,
    equityAccountSubtype: EquityAccountSubtype.INCOME,
  },
  {
    value: "expense-1",
    label: "Groceries",
    unit: null,
    type: AccountType.EQUITY,
    equityAccountSubtype: EquityAccountSubtype.EXPENSE,
  },
];

function createRow(
  overrides: Partial<StatementImportCsvRow> = {},
): StatementImportCsvRow {
  return {
    date: "2026-02-03",
    amount: "100.25",
    "original amount": "92.50",
    "original currency": "EUR",
    "exchange rate": "1.083784",
    description: "Transfer",
    ...overrides,
  };
}

describe("statement import", () => {
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
      date: "2026-02-03T00:00:00.000Z",
      amount: 100.25,
      originalAmount: 92.5,
      originalCurrency: "EUR",
      exchangeRate: 1.083784,
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
      exchangeRate: 1.083784,
      description: "Transfer",
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
      exchangeRate: 1.083784,
      description: "Transfer",
    });
  });

  test("rejects CSVs with fewer than six columns", () => {
    const result = parseStatementImportCsv({
      currentAccount,
      text: ["date,amount,original amount", "2026-02-03,100.25,92.50"].join(
        "\n",
      ),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors[0]).toContain(
      "CSV must include at least 6 columns in this order",
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
        "Row 2: exchange rate must be greater than zero.",
        "Row 2: original currency must be a 3-letter uppercase code.",
      ]),
    );
  });

  test("maps negative statement amounts to credit current-account bookings", () => {
    const draft = createStatementImportDraft({
      row: createRow({ amount: "-45.10", "original amount": "42.00" }),
      sourceRowNumber: 2,
      currentAccount,
    });

    expect(draft.transaction.bookings).toMatchObject([
      { accountId: "asset-1", value: -45.1 },
      { accountId: "", currency: "EUR", value: 42 },
    ]);
  });

  test("marks drafts as needing a counter account before import", () => {
    const draft = createStatementImportDraft({
      row: createRow(),
      sourceRowNumber: 2,
      currentAccount,
    });

    expect(
      getStatementImportDraftStatus({ draft, accounts: accountOptions }),
    ).toMatchObject({
      kind: "needs-edit",
      message: "Counter account is required.",
    });
  });

  test("validates same-currency drafts before import", () => {
    const draft = createStatementImportDraft({
      row: createRow({
        amount: "100.00",
        "original amount": "90.00",
        "original currency": "CHF",
      }),
      sourceRowNumber: 2,
      currentAccount,
    });
    draft.transaction.bookings[1] = {
      ...draft.transaction.bookings[1],
      accountId: "income-1",
    };

    expect(
      getStatementImportDraftStatus({ draft, accounts: accountOptions }),
    ).toMatchObject({
      kind: "error",
      message: "The sum of all bookings must be zero.",
    });

    draft.transaction.bookings[1] = {
      ...draft.transaction.bookings[1],
      value: -100,
    };
    expect(
      getStatementImportDraftStatus({ draft, accounts: accountOptions }).kind,
    ).toBe("ready");
  });
});
