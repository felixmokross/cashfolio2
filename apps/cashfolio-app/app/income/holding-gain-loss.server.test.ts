import { describe, expect, test } from "vitest";
import { prisma } from "~/prisma.server";
import { generateHoldingBookingsForAccount } from "./holding-gain-loss.server";
import { AccountType, Unit } from "~/.prisma-client/enums";
import { redis } from "~/redis.server";
import { Decimal } from "@prisma/client-runtime-utils";
import type { Booking } from "~/.prisma-client/client";
import { getCurrencyUnitInfo } from "~/units/functions";
import { createTestAccount, testAccountBook } from "test-setup";
import { parseISO } from "date-fns";

describe("generateHoldingBookingsForAccount", () => {
  test("returns holding bookings for account", async () => {
    await redis.ts.add(`fx:CHF`, parseISO("2025-10-31").getTime(), 1.1);
    await redis.ts.add(`fx:EUR`, parseISO("2025-10-31").getTime(), 1);
    await redis.ts.add(`fx:CHF`, parseISO("2025-11-30").getTime(), 1.05);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-30").getTime(), 1);

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
