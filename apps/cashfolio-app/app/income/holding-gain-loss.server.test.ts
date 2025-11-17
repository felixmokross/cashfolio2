import { describe, expect, test } from "vitest";
import { prisma } from "~/prisma.server";
import {
  generateHoldingBookingsForAccount,
  getHoldingGainLoss,
} from "./holding-gain-loss.server";
import { AccountType, Unit } from "~/.prisma-client/enums";
import { redis } from "~/redis.server";
import { Decimal } from "@prisma/client/runtime/library";
import type { Booking } from "~/.prisma-client/client";
import { getCurrencyUnitInfo } from "~/units/functions";
import {
  createTestAccount,
  setupTestHoldingGainLossAccountGroups,
  testAccountBook,
} from "test-setup";
import { parseISO } from "date-fns";

describe("generateHoldingBookingsForAccount", () => {
  test("returns holding bookings for account", async () => {
    await redis.set("2025-10-31", JSON.stringify({ USDCHF: 1.1, USDEUR: 1 }));
    await redis.set("2025-11-30", JSON.stringify({ USDCHF: 1.05, USDEUR: 1 }));

    const holdingAccount = await createTestAccount(
      { type: AccountType.ASSET, unit: getCurrencyUnitInfo("EUR") },
      {
        date: "2025-10-12",
        currency: "EUR",
        value: 1000,
      },
    );

    const result = await generateHoldingBookingsForAccount(
      await prisma.accountBook.findUniqueOrThrow({
        where: { id: testAccountBook.id },
      }),
      { ...holdingAccount, bookings: [] },
      parseISO("2025-11-01"),
      parseISO("2025-11-30"),
    );

    expect(result).toEqual([
      expect.objectContaining<Partial<Booking>>({
        date: parseISO("2025-11-30"),
        value: new Decimal(50),
        unit: Unit.CURRENCY,
        currency: "CHF",
      }),
    ]);
  });
});

describe("getHoldingGainLoss", () => {
  test("returns holding gain/loss", async () => {
    await redis.set("2025-10-31", JSON.stringify({ USDCHF: 1.1, USDEUR: 1 }));
    await redis.set("2025-11-30", JSON.stringify({ USDCHF: 1.05, USDEUR: 1 }));

    await setupTestHoldingGainLossAccountGroups();

    const holdingAccount = await createTestAccount(
      { type: AccountType.ASSET, unit: getCurrencyUnitInfo("EUR") },
      {
        date: "2025-10-12",
        currency: "EUR",
        value: 1000,
      },
    );

    const result = await getHoldingGainLoss(
      testAccountBook.id,
      parseISO("2025-11-01"),
      parseISO("2025-11-30"),
    );

    expect(result).toEqual({
      accounts: [
        expect.objectContaining({
          id: `holding-gain-loss-${holdingAccount.id}`,
        }),
      ],
      accountGroups: [
        expect.objectContaining({ name: "FX Holding Gain/Loss" }),
        expect.objectContaining({ name: "Crypto Holding Gain/Loss" }),
        expect.objectContaining({ name: "Security Holding Gain/Loss" }),
      ],
      incomeByAccountId: new Map([
        [`holding-gain-loss-${holdingAccount.id}`, new Decimal(50)],
      ]),
    });
  });
});
