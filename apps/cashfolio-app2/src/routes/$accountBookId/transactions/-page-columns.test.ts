import { describe, expect, test } from "vitest";
import {
  getTransactionAccountFilterValues,
  getTransactionUnitIdentifierFilterValues,
} from "./-page-columns";

describe("getTransactionAccountFilterValues", () => {
  test("exposes visible account names for multi-account filters", () => {
    expect(
      getTransactionAccountFilterValues([{ name: "Bank" }, { name: "Broker" }]),
    ).toEqual(["Bank", "Broker"]);
  });
});

describe("getTransactionUnitIdentifierFilterValues", () => {
  test("returns unit identifiers as separate filter values", () => {
    expect(
      getTransactionUnitIdentifierFilterValues({
        unitIdentifiers: ["CHF", "USD"],
      }),
    ).toEqual(["CHF", "USD"]);
  });
});
