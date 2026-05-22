import { describe, expect, test } from "vitest";
import {
  createSimpleTransactionFormInitialValues,
  toSimpleTransactionSubmitDate,
} from "./simple-transaction-modal";

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

describe("toSimpleTransactionSubmitDate", () => {
  test("serializes the default DateInput date as a canonical UTC day", () => {
    const today = new Date(2026, 4, 18);

    expect(toSimpleTransactionSubmitDate(today, today)).toBe(
      "2026-05-18T00:00:00.000Z",
    );
  });

  test("uses the fallback date when the submitted date is empty", () => {
    const fallback = new Date(2026, 4, 18);

    expect(toSimpleTransactionSubmitDate(null, fallback)).toBe(
      "2026-05-18T00:00:00.000Z",
    );
  });
});
