import { describe, expect, test } from "vitest";
import { Unit } from "@/.prisma-client/enums";
import {
  getStatementImportBulkIgnoredActionLabel,
  getStatementImportIgnoredCount,
  getStatementImportReadyCount,
  getStatementImportSuccessLedgerSearch,
  getStatementImportSummaryText,
  getStatementImportTransactionsToSubmit,
  isStatementImportDisabled,
  setStatementImportDraftsIgnored,
  toggleStatementImportDraftIgnored,
} from "./-statement-import-page-controller";
import type {
  StatementImportDraft,
  StatementImportDraftStatus,
} from "./-statement-import";

function createDraft(
  overrides: Partial<StatementImportDraft> = {},
): StatementImportDraft {
  const id = overrides.id ?? "draft-1";
  return {
    id,
    sourceRowNumber: 2,
    currentAccountId: "account-1",
    ignored: false,
    date: "2026-02-05T00:00:00.000Z",
    amount: 10,
    originalAmount: undefined,
    originalCurrency: undefined,
    counterAccountId: "counter-1",
    description: id,
    transaction: {
      description: id,
      bookings: [
        {
          date: "2026-02-05T00:00:00.000Z",
          accountId: "account-1",
          description: "",
          unit: Unit.CURRENCY,
          currency: "CHF",
          value: 10,
        },
        {
          date: "2026-02-05T00:00:00.000Z",
          accountId: "counter-1",
          description: "",
          unit: Unit.CURRENCY,
          currency: "CHF",
          value: -10,
        },
      ],
    },
    ...overrides,
  };
}

const readyStatus: StatementImportDraftStatus = {
  kind: "ready",
  label: "Ready",
  color: "green",
  message: null,
};

const errorStatus: StatementImportDraftStatus = {
  kind: "error",
  label: "Error",
  color: "red",
  message: "Counter account is required.",
};

describe("statement import page controller", () => {
  test("moves filtered ledgers to the latest imported booking period", () => {
    const search = getStatementImportSuccessLedgerSearch({
      selectedPeriodValue: "2026-01",
      createdTransactions: [{ id: "tx-import-1" }, { id: "tx-import-2" }],
      transactions: [
        {
          description: "Earlier",
          bookings: [
            {
              date: "2026-02-05T00:00:00.000Z",
              accountId: "account-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: 10,
            },
            {
              date: "2026-02-05T00:00:00.000Z",
              accountId: "counter-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: -10,
            },
          ],
        },
        {
          description: "Later",
          bookings: [
            {
              date: "2026-03-05T00:00:00.000Z",
              accountId: "account-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: -20,
            },
            {
              date: "2026-03-05T00:00:00.000Z",
              accountId: "counter-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: 20,
            },
          ],
        },
      ],
    });

    expect(search).toEqual({
      period: "2026-03",
      transactionId: "tx-import-2",
    });
  });

  test("scrolls to the imported transaction that determined the period", () => {
    const search = getStatementImportSuccessLedgerSearch({
      selectedPeriodValue: "2026-01",
      createdTransactions: [{ id: "tx-import-1" }, { id: "tx-import-2" }],
      transactions: [
        {
          description: "Later imported first",
          bookings: [
            {
              date: "2026-03-05T00:00:00.000Z",
              accountId: "account-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: 10,
            },
            {
              date: "2026-03-05T00:00:00.000Z",
              accountId: "counter-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: -10,
            },
          ],
        },
        {
          description: "Earlier imported last",
          bookings: [
            {
              date: "2026-02-05T00:00:00.000Z",
              accountId: "account-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: -20,
            },
            {
              date: "2026-02-05T00:00:00.000Z",
              accountId: "counter-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: 20,
            },
          ],
        },
      ],
    });

    expect(search).toEqual({
      period: "2026-03",
      transactionId: "tx-import-1",
    });
  });

  test("keeps all-period ledgers unfiltered after import", () => {
    const search = getStatementImportSuccessLedgerSearch({
      selectedPeriodValue: undefined,
      createdTransactions: [{ id: "tx-import-1" }],
      transactions: [
        {
          description: "Imported",
          bookings: [
            {
              date: "2026-03-05T00:00:00.000Z",
              accountId: "account-1",
              description: "",
              unit: Unit.CURRENCY,
              currency: "CHF",
              value: -20,
            },
          ],
        },
      ],
    });

    expect(search).toEqual({
      period: undefined,
      transactionId: "tx-import-1",
    });
  });

  test("excludes ignored drafts from submit payloads and readiness", () => {
    const readyDraft = createDraft({ id: "ready-draft" });
    const ignoredDraft = createDraft({
      id: "ignored-draft",
      ignored: true,
      transaction: {
        description: "Ignored",
        bookings: [],
      },
    });
    const drafts = [readyDraft, ignoredDraft];
    const statuses = new Map<string, StatementImportDraftStatus>([
      [readyDraft.id, readyStatus],
      [ignoredDraft.id, errorStatus],
    ]);

    expect(getStatementImportIgnoredCount(drafts)).toBe(1);
    expect(getStatementImportReadyCount({ drafts, statuses })).toBe(1);
    expect(
      isStatementImportDisabled({
        drafts,
        readyCount: 1,
        isSubmitting: false,
        isEditSubmitting: false,
      }),
    ).toBe(false);
    expect(getStatementImportTransactionsToSubmit(drafts)).toEqual([
      readyDraft.transaction,
    ]);
    expect(
      getStatementImportSummaryText({
        drafts,
        readyCount: 1,
        ignoredCount: 1,
      }),
    ).toBe("1 of 2 ready, 1 ignored");
  });

  test("disables import when every draft is ignored", () => {
    const drafts = [createDraft({ ignored: true })];

    expect(
      isStatementImportDisabled({
        drafts,
        readyCount: 0,
        isSubmitting: false,
        isEditSubmitting: false,
      }),
    ).toBe(true);
    expect(getStatementImportTransactionsToSubmit(drafts)).toEqual([]);
  });

  test("toggles ignored state without changing draft data", () => {
    const draft = createDraft();

    const [ignoredDraft] = toggleStatementImportDraftIgnored([draft], draft.id);
    expect(ignoredDraft).toEqual({
      ...draft,
      ignored: true,
    });

    const [includedDraft] = toggleStatementImportDraftIgnored(
      [ignoredDraft],
      draft.id,
    );
    expect(includedDraft).toEqual(draft);
  });

  test("bulk ignores selected drafts without changing unselected drafts", () => {
    const firstDraft = createDraft({ id: "draft-1" });
    const secondDraft = createDraft({ id: "draft-2" });
    const unselectedDraft = createDraft({ id: "draft-3" });

    const result = setStatementImportDraftsIgnored({
      drafts: [firstDraft, secondDraft, unselectedDraft],
      draftIds: [firstDraft.id, secondDraft.id],
      ignored: true,
    });

    expect(result).toEqual([
      { ...firstDraft, ignored: true },
      { ...secondDraft, ignored: true },
      unselectedDraft,
    ]);
  });

  test("bulk ignore supports a single selected draft", () => {
    const selectedDraft = createDraft({ id: "selected-draft" });
    const unselectedDraft = createDraft({ id: "unselected-draft" });

    const result = setStatementImportDraftsIgnored({
      drafts: [selectedDraft, unselectedDraft],
      draftIds: [selectedDraft.id],
      ignored: true,
    });

    expect(result).toEqual([
      { ...selectedDraft, ignored: true },
      unselectedDraft,
    ]);
  });

  test("bulk unignores selected drafts", () => {
    const firstDraft = createDraft({ id: "draft-1", ignored: true });
    const secondDraft = createDraft({ id: "draft-2", ignored: true });

    const result = setStatementImportDraftsIgnored({
      drafts: [firstDraft, secondDraft],
      draftIds: [firstDraft.id, secondDraft.id],
      ignored: false,
    });

    expect(result).toEqual([
      { ...firstDraft, ignored: false },
      { ...secondDraft, ignored: false },
    ]);
  });

  test("bulk ignore keeps already ignored selected draft data unchanged", () => {
    const includedDraft = createDraft({ id: "included-draft" });
    const ignoredDraft = createDraft({
      id: "ignored-draft",
      ignored: true,
      transaction: {
        description: "Ignored custom transaction",
        bookings: [],
      },
    });

    const result = setStatementImportDraftsIgnored({
      drafts: [includedDraft, ignoredDraft],
      draftIds: [includedDraft.id, ignoredDraft.id],
      ignored: true,
    });

    expect(result).toEqual([{ ...includedDraft, ignored: true }, ignoredDraft]);
  });

  test("bulk ignore action labels use singular and plural selected row text", () => {
    expect(
      getStatementImportBulkIgnoredActionLabel({
        shouldIgnore: true,
        selectedDraftCount: 1,
      }),
    ).toBe("Ignore 1 selected row");
    expect(
      getStatementImportBulkIgnoredActionLabel({
        shouldIgnore: false,
        selectedDraftCount: 2,
      }),
    ).toBe("Unignore 2 selected rows");
  });
});
