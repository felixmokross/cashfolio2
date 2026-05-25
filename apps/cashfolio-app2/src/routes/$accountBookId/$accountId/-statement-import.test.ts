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
  hasStatementImportSingleCounterBooking,
  parseStatementImportCsv,
  shouldIncludeStatementImportAccountOption,
  updateStatementImportDraftCounterAccount,
  updateStatementImportDraftTransaction,
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
  {
    value: "asset-usd",
    label: "USD Cash",
    unit: Unit.CURRENCY,
    currency: "USD",
    type: AccountType.ASSET,
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
        "date,amount,original amount,original currency,exchange rate,description",
        "2026-02-03,100.25,92.50,EUR,not a rate,Transfer",
        "2026-02-04,80.00,75.00,EUR,1,25,Transfer",
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
      text: ["date,amount,original amount", "2026-02-03,100.25,92.50"].join(
        "\n",
      ),
    });

    expect(result.drafts).toEqual([]);
    expect(result.errors[0]).toContain(
      "CSV must include at least 6 columns in this order",
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

  test("direct counter-account edits mark a draft ready", () => {
    const draft = createStatementImportDraft({
      row: createRow(),
      sourceRowNumber: 2,
      currentAccount,
    });

    const updated = updateStatementImportDraftCounterAccount({
      draft,
      selectedAccount: accountOptions.find(
        (account) => account.value === "income-1",
      ),
    });

    expect(updated.transaction.bookings[1]).toMatchObject({
      accountId: "income-1",
      unit: Unit.CURRENCY,
      currency: "EUR",
      value: -92.5,
    });
    expect(updated.counterAccountId).toBe("income-1");
    expect(
      getStatementImportDraftStatus({
        draft: updated,
        accounts: accountOptions,
      }).kind,
    ).toBe("ready");
  });

  test("direct counter-account edits apply concrete account unit fields", () => {
    const draft = createStatementImportDraft({
      row: createRow(),
      sourceRowNumber: 2,
      currentAccount,
    });

    const updated = updateStatementImportDraftCounterAccount({
      draft,
      selectedAccount: accountOptions.find(
        (account) => account.value === "asset-usd",
      ),
    });

    expect(updated.transaction.bookings[1]).toMatchObject({
      accountId: "asset-usd",
      unit: Unit.CURRENCY,
      currency: "USD",
      value: -92.5,
    });
    expect(updated.counterAccountId).toBe("asset-usd");
  });

  test("direct counter-account edits preserve imported units for unitless equity accounts", () => {
    const draft = createStatementImportDraft({
      row: createRow({
        amount: "-45.10",
        "original amount": "42.00",
        "original currency": "EUR",
      }),
      sourceRowNumber: 2,
      currentAccount,
    });

    const updated = updateStatementImportDraftCounterAccount({
      draft,
      selectedAccount: accountOptions.find(
        (account) => account.value === "expense-1",
      ),
    });

    expect(updated.transaction.bookings[1]).toMatchObject({
      accountId: "expense-1",
      unit: Unit.CURRENCY,
      currency: "EUR",
      value: 42,
    });
    expect(updated.counterAccountId).toBe("expense-1");
  });

  test("direct counter-account edits keep targeting the counter booking after row reorder", () => {
    const draft = createStatementImportDraft({
      row: createRow(),
      sourceRowNumber: 2,
      currentAccount,
    });
    const withCounterAccount = updateStatementImportDraftCounterAccount({
      draft,
      selectedAccount: accountOptions.find(
        (account) => account.value === "income-1",
      ),
    });
    const reordered = updateStatementImportDraftTransaction({
      draft: withCounterAccount,
      transaction: {
        ...withCounterAccount.transaction,
        bookings: [...withCounterAccount.transaction.bookings].reverse(),
      },
    });

    const updated = updateStatementImportDraftCounterAccount({
      draft: reordered,
      selectedAccount: accountOptions.find(
        (account) => account.value === "asset-usd",
      ),
    });

    expect(updated.currentAccountId).toBe("asset-1");
    expect(updated.transaction.bookings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: "asset-1",
          currency: "CHF",
          value: 100.25,
        }),
        expect.objectContaining({
          accountId: "asset-usd",
          currency: "USD",
          value: -92.5,
        }),
      ]),
    );
  });

  test("single-counter detection allows simple import drafts", () => {
    const draft = createStatementImportDraft({
      row: createRow(),
      sourceRowNumber: 2,
      currentAccount,
    });
    const withCounterAccount = updateStatementImportDraftCounterAccount({
      draft,
      selectedAccount: accountOptions.find(
        (account) => account.value === "income-1",
      ),
    });

    expect(hasStatementImportSingleCounterBooking(draft)).toBe(true);
    expect(hasStatementImportSingleCounterBooking(withCounterAccount)).toBe(
      true,
    );
  });

  test("single-counter detection treats multiple counter bookings as multiple", () => {
    const draft = createStatementImportDraft({
      row: createRow({ "original currency": "CHF" }),
      sourceRowNumber: 2,
      currentAccount,
    });
    const withMultipleCounters = updateStatementImportDraftTransaction({
      draft,
      transaction: {
        ...draft.transaction,
        bookings: [
          {
            ...draft.transaction.bookings[0],
            accountId: "asset-1",
            value: 100.25,
          },
          {
            ...draft.transaction.bookings[1],
            accountId: "income-1",
            value: -60,
          },
          {
            ...draft.transaction.bookings[1],
            accountId: "income-1",
            value: -40.25,
          },
        ],
      },
    });

    expect(hasStatementImportSingleCounterBooking(withMultipleCounters)).toBe(
      false,
    );
  });

  test("single-counter detection treats missing counter bookings as multiple", () => {
    const draft = createStatementImportDraft({
      row: createRow(),
      sourceRowNumber: 2,
      currentAccount,
    });
    const withoutCounter = updateStatementImportDraftTransaction({
      draft,
      transaction: {
        ...draft.transaction,
        bookings: draft.transaction.bookings.filter(
          (booking) => booking.accountId === "asset-1",
        ),
      },
    });

    expect(hasStatementImportSingleCounterBooking(withoutCounter)).toBe(false);
  });

  test("single-counter detection allows multiple current account bookings", () => {
    const draft = createStatementImportDraft({
      row: createRow({ "original currency": "CHF" }),
      sourceRowNumber: 2,
      currentAccount,
    });
    const withMultipleCurrentBookings = updateStatementImportDraftTransaction({
      draft,
      transaction: {
        ...draft.transaction,
        bookings: [
          {
            ...draft.transaction.bookings[0],
            accountId: "asset-1",
            value: 60,
          },
          {
            ...draft.transaction.bookings[0],
            accountId: "asset-1",
            value: 40.25,
          },
          {
            ...draft.transaction.bookings[1],
            accountId: "income-1",
            value: -100.25,
          },
        ],
      },
    });

    expect(
      hasStatementImportSingleCounterBooking(withMultipleCurrentBookings),
    ).toBe(true);
  });

  test("direct counter-account edits ignore multiple counter drafts", () => {
    const draft = createStatementImportDraft({
      row: createRow({ "original currency": "CHF" }),
      sourceRowNumber: 2,
      currentAccount,
    });
    const withMultipleCounters = updateStatementImportDraftTransaction({
      draft,
      transaction: {
        ...draft.transaction,
        bookings: [
          draft.transaction.bookings[0],
          { ...draft.transaction.bookings[1], accountId: "income-1" },
          { ...draft.transaction.bookings[1], accountId: "expense-1" },
        ],
      },
    });

    const updated = updateStatementImportDraftCounterAccount({
      draft: withMultipleCounters,
      selectedAccount: accountOptions.find(
        (account) => account.value === "asset-usd",
      ),
    });

    expect(updated).toBe(withMultipleCounters);
  });

  test("drafts are not ready when edits remove the current ledger account booking", () => {
    const draft = createStatementImportDraft({
      row: createRow(),
      sourceRowNumber: 2,
      currentAccount,
    });
    const withCounterAccount = updateStatementImportDraftCounterAccount({
      draft,
      selectedAccount: accountOptions.find(
        (account) => account.value === "income-1",
      ),
    });
    const withoutCurrentAccount = updateStatementImportDraftTransaction({
      draft: withCounterAccount,
      transaction: {
        ...withCounterAccount.transaction,
        bookings: withCounterAccount.transaction.bookings.filter(
          (booking) => booking.accountId !== "asset-1",
        ),
      },
    });

    expect(
      getStatementImportDraftStatus({
        draft: withoutCurrentAccount,
        accounts: accountOptions,
      }),
    ).toMatchObject({
      kind: "error",
      message: "Imported transaction must include the current ledger account.",
    });
  });

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
