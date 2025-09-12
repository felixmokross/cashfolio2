import { describe, expect, test } from "vitest";
import { sum } from "./utils";
import { Prisma } from "@prisma/client";

describe("sum", () => {
  test("returns the sum of the passed values", () => {
    const result = sum([
      new Prisma.Decimal(100),
      new Prisma.Decimal(-50),
      new Prisma.Decimal(25.5),
    ]);
    expect(result).toEqual(new Prisma.Decimal(75.5));
  });
});
