import { describe, expect, test } from "vitest";
import {
  createCopySimpleTransactionInitialValues,
  normalizeSimpleDraft,
} from "./-page-transaction-utils";

describe("normalizeSimpleDraft", () => {
  const fallback = {
    date: new Date("2026-01-15T00:00:00.000Z"),
    description: "Fallback description",
    counterAccountId: "fallback-counter",
    amount: 42,
    direction: "DEBIT" as const,
  };

  test("uses valid string dates from the draft", () => {
    const result = normalizeSimpleDraft({
      draft: {
        date: "2026-02-10T00:00:00.000Z",
        description: "Draft description",
        counterAccountId: "counter-1",
        amount: 10,
        direction: "CREDIT",
      },
      fallback,
    });

    expect(result.date).toBe("2026-02-10T00:00:00.000Z");
  });

  test("falls back to the fallback date when draft date is invalid", () => {
    const result = normalizeSimpleDraft({
      draft: {
        date: "not-a-date",
        description: "Draft description",
        counterAccountId: "counter-1",
        amount: 10,
        direction: "CREDIT",
      },
      fallback,
    });

    expect(result.date).toBe(fallback.date.toISOString());
  });
});

describe("createCopySimpleTransactionInitialValues", () => {
  test("keeps simple transaction fields while removing the source date", () => {
    const result = createCopySimpleTransactionInitialValues({
      date: new Date("2026-01-15T00:00:00.000Z"),
      description: "Salary",
      counterAccountId: "income-1",
      amount: 100,
      direction: "DEBIT",
    });

    expect(result).toEqual({
      description: "Salary",
      counterAccountId: "income-1",
      amount: 100,
      direction: "DEBIT",
    });
  });
});
