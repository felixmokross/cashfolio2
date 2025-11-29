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
    await redis.ts.add(`fx:CHF`, parseISO("2025-10-12").getTime(), 1.2);
    await redis.ts.add(`fx:EUR`, parseISO("2025-10-12").getTime(), 1);
    await redis.ts.add(`fx:CHF`, parseISO("2025-10-31").getTime(), 1.1);
    await redis.ts.add(`fx:EUR`, parseISO("2025-10-31").getTime(), 1);
    await redis.ts.add(`fx:CHF`, parseISO("2025-11-13").getTime(), 1.2);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-13").getTime(), 1);
    await redis.ts.add(`fx:CHF`, parseISO("2025-11-15").getTime(), 1.4);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-15").getTime(), 1);
    await redis.ts.add(`fx:CHF`, parseISO("2025-11-30").getTime(), 1.05);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-30").getTime(), 1);

    await setupTestHoldingGainLossAccountGroups();

    const holdingAccount = await createTestAccount(
      { type: AccountType.ASSET, unit: getCurrencyUnitInfo("EUR") },
      {
        date: "2025-10-12",
        currency: "EUR",
        value: 1000,
      },
      {
        date: "2025-11-15",
        currency: "EUR",
        value: 300,
      },
      {
        // store in reverse chronological order to test sorting, as it is crucial for correct calculation
        date: "2025-11-13",
        currency: "EUR",
        value: 200,
      },
    );

    const result = await getIncome(
      testAccountBook.id,
      parseISO("2025-11-01"),
      parseISO("2025-11-30"),
    );

    expect(result).toEqual(
      expect.objectContaining({
        accounts: expect.arrayContaining([
          expect.objectContaining({
            id: `holding-gain-loss-${holdingAccount.id}`,
            groupId: result.accountGroups.find((ag) => ag.name === "EUR")?.id,
          }),
        ]),
        accountGroups: expect.arrayContaining([
          expect.objectContaining({
            name: "EUR",
            parentGroupId: result.accountGroups.find(
              (ag) => ag.name === "FX Holding Gain/Loss",
            )?.id,
          }),
          expect.objectContaining({ name: "FX Holding Gain/Loss" }),
          expect.objectContaining({ name: "Crypto Holding Gain/Loss" }),
          expect.objectContaining({ name: "Security Holding Gain/Loss" }),
        ]),
      }),
    );

    expect([...result.incomeByAccountId.entries()]).toEqual(
      expect.arrayContaining([
        [`holding-gain-loss-${holdingAccount.id}`, new Decimal(185)],
      ]),
    );
  });

  test("returns equity account income", async () => {
    await redis.ts.add(`fx:CHF`, parseISO("2025-11-15").getTime(), 1.1);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-15").getTime(), 1);

    const salaryAccount = await createTestAccount(
      { type: AccountType.EQUITY },
      {
        date: "2025-11-15",
        currency: "CHF",
        value: 10000,
      },
    );

    const groceriesAccount = await createTestAccount(
      { type: AccountType.EQUITY },
      { date: "2025-11-10", currency: "CHF", value: -200 },
      { date: "2025-11-15", currency: "EUR", value: -150 },
    );

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

    expect(result).toEqual(
      expect.objectContaining({
        accounts: expect.arrayContaining([
          salaryAccount,
          groceriesAccount,
          rentAccount,
        ]),
        accountGroups: [
          expect.objectContaining({
            type: AccountType.EQUITY,
            parentGroupId: null,
          }),
        ],
      }),
    );

    expect([...result.incomeByAccountId.entries()]).toEqual(
      expect.arrayContaining([
        [salaryAccount.id, new Decimal(10000)],
        [groceriesAccount.id, new Decimal(-365)],
        [rentAccount.id, new Decimal(-2000)],
      ]),
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
