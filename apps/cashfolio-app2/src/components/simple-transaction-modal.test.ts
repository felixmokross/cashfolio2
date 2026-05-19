import { describe, expect, test } from "vitest";
import { createSimpleTransactionFormInitialValues } from "./simple-transaction-modal";

describe("createSimpleTransactionFormInitialValues", () => {
  test("uses the add-transaction default date when initial values are omitted", () => {
    const today = new Date("2026-05-18T00:00:00.000Z");

    const result = createSimpleTransactionFormInitialValues({
      today,
    });

    expect(result).toEqual({
      date: today,
      description: "",
      counterAccountId: "",
      amount: undefined,
      direction: "DEBIT",
    });
  });

  test("keeps date empty when copied initial values omit date", () => {
    const today = new Date("2026-05-18T00:00:00.000Z");

    const result = createSimpleTransactionFormInitialValues({
      today,
      initialValues: {
        description: "Copied transaction",
        counterAccountId: "expense-1",
        amount: 12,
        direction: "CREDIT",
      },
    });

    expect(result).toEqual({
      date: undefined,
      description: "Copied transaction",
      counterAccountId: "expense-1",
      amount: 12,
      direction: "CREDIT",
    });
  });
});
