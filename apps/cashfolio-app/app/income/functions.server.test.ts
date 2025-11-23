import { describe, expect, test } from "vitest";
import { getIncome } from "./functions.server";
import { Decimal } from "@prisma/client/runtime/library";
import { AccountType } from "~/.prisma-client/enums";
import { redis } from "~/redis.server";
import {
  createTestAccount,
  createTestTransaction,
  setupTestHoldingGainLossAccountGroups,
  testAccountBook,
} from "test-setup";
import { getCurrencyUnitInfo } from "~/units/functions";
import { TRANSACTION_GAIN_LOSS_ACCOUNT_ID } from "./transaction-gain-loss.server";
import { parseISO } from "date-fns";

describe("getIncome", () => {
  test("returns holding gain/loss", async () => {
    await redis.ts.add(`fx:CHF`, parseISO("2025-10-31").getTime(), 1.1);
    await redis.ts.add(`fx:EUR`, parseISO("2025-10-31").getTime(), 1);
    await redis.ts.add(`fx:CHF`, parseISO("2025-11-30").getTime(), 1.05);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-30").getTime(), 1);

    await setupTestHoldingGainLossAccountGroups();

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
      parseISO("2025-11-01"),
      parseISO("2025-11-30"),
    );

    expect([...result.incomeByAccountId.entries()]).toEqual(
      expect.arrayContaining([
        [`holding-gain-loss-${holdingAccount.id}`, new Decimal(50)],
      ]),
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
      parseISO("2025-11-01"),
      parseISO("2025-11-30"),
    );

    expect([...result.incomeByAccountId.entries()]).toEqual(
      expect.arrayContaining([[rentAccount.id, new Decimal(-2000)]]),
    );
  });

  test("returns transaction gain/loss", async () => {
    const account1 = await createTestAccount({ type: AccountType.ASSET });
    const account2 = await createTestAccount({ type: AccountType.ASSET });

    await redis.ts.add(`fx:CHF`, parseISO("2025-11-15").getTime(), 1.1);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-15").getTime(), 1);

    await createTestTransaction(
      {
        date: "2025-11-15",
        accountId: account1.id,
        currency: "CHF",
        value: -1070,
      },
      {
        date: "2025-11-15",
        accountId: account2.id,
        currency: "EUR",
        value: 1000,
      },
    );

    const result = await getIncome(
      testAccountBook.id,
      parseISO("2025-11-01"),
      parseISO("2025-11-30"),
    );

    expect([...result.incomeByAccountId.entries()]).toEqual(
      expect.arrayContaining([
        [TRANSACTION_GAIN_LOSS_ACCOUNT_ID, new Decimal(-30)],
      ]),
    );
  });
});
