import { describe, expect, test } from "vitest";
import { buildCounterpartyLedgerSearch } from "./-counterparty-ledger-search";
import { getLedgerCounterpartyAccountFilterValues } from "./-page-columns";

describe("buildCounterpartyLedgerSearch", () => {
  test("includes the selected period when provided", () => {
    expect(
      buildCounterpartyLedgerSearch({
        transactionId: "tx-1",
        selectedPeriodValue: "2026-02",
      }),
    ).toEqual({
      transactionId: "tx-1",
      period: "2026-02",
    });
  });

  test("keeps period undefined when no period is selected", () => {
    expect(
      buildCounterpartyLedgerSearch({
        transactionId: "tx-1",
      }),
    ).toEqual({
      transactionId: "tx-1",
      period: undefined,
    });
  });
});

describe("getLedgerCounterpartyAccountFilterValues", () => {
  test("exposes visible account names for multi-account filters", () => {
    expect(
      getLedgerCounterpartyAccountFilterValues([
        { name: "Salary" },
        { name: "Broker" },
      ]),
    ).toEqual(["Salary", "Broker"]);
  });
});
