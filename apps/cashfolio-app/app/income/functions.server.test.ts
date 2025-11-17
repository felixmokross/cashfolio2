import { describe, expect, test } from "vitest";
import { getIncome } from "./functions.server";
import { Decimal } from "@prisma/client/runtime/library";
import { AccountType } from "~/.prisma-client/enums";
import { redis } from "~/redis.server";
import { createTestAccount, testAccountBook } from "test-setup";
import { getCurrencyUnitInfo } from "~/units/functions";

describe("getIncome", () => {
  test("returns holding gain/loss", async () => {
    await redis.set("2025-10-31", JSON.stringify({ USDCHF: 1.1, USDEUR: 1 }));
    await redis.set("2025-11-30", JSON.stringify({ USDCHF: 1.05, USDEUR: 1 }));

    const holdingAccount = await createTestAccount(
      {
        type: AccountType.ASSET,
        unit: getCurrencyUnitInfo("EUR"),
      },
      {
        date: "2025-10-12",
        currency: "EUR",
        value: 1000,
      },
    );

    const result = await getIncome(
      testAccountBook.id,
      new Date("2025-11-01"),
      new Date("2025-11-30"),
    );

    expect(result).toEqual(
      new Map([[`holding-gain-loss-${holdingAccount.id}`, new Decimal(50)]]),
    );
  });

  test("returns equity account income", async () => {
    const rentAccount = await createTestAccount(
      { type: AccountType.EQUITY },
      {
        date: "2025-11-01",
        currency: "CHF",
        value: -2000,
      },
    );

    const result = await getIncome(
      testAccountBook.id,
      new Date("2025-11-01"),
      new Date("2025-11-30"),
    );

    expect(result).toEqual(new Map([[rentAccount.id, new Decimal(-2000)]]));
  });
});
