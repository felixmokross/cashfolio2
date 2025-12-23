import { describe, expect, test } from "vitest";
import { sum } from "./utils.server";
import { Decimal } from "@prisma/client-runtime-utils";

describe("sum", () => {
  test("returns the sum of the passed values", () => {
    const result = sum([new Decimal(100), new Decimal(-50), new Decimal(25.5)]);
    expect(result).toEqual(new Decimal(75.5));
  });
});
