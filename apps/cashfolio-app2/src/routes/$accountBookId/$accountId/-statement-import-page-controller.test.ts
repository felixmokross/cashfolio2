import { describe, expect, test } from "vitest";
import { Unit } from "@/.prisma-client/enums";
import { getStatementImportSuccessLedgerSearch } from "./-statement-import-page-controller";

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
});
