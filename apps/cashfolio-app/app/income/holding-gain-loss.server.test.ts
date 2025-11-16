import { beforeEach, describe, expect, test } from "vitest";
import { buildAccountBook } from "~/account-books/builders";
import { prisma } from "~/prisma.server";
import { generateHoldingBookingsForAccount } from "./holding-gain-loss.server";
import { AccountType, Unit } from "~/.prisma-client/enums";
import { redis } from "~/redis.server";
import { buildAccount } from "~/accounts/builders";
import { buildAccountGroup } from "~/account-groups/builders";
import { buildBooking, buildTransaction } from "~/transactions/builders";
import { Decimal } from "@prisma/client/runtime/library";
import type { Booking } from "~/.prisma-client/client";

describe("generateHoldingBookingsForAccount", () => {
  beforeEach(async () => {
    await prisma.accountBook.deleteMany();

    await prisma.accountBook.create({
      data: buildAccountBook({
        id: "account-book-1",
        referenceCurrency: "CHF",
      }),
    });
    await prisma.accountGroup.createMany({
      data: [
        buildAccountGroup({
          id: "assets",
          type: AccountType.ASSET,
          accountBookId: "account-book-1",
        }),
      ],
    });
  });

  test("returns holding bookings for account", async () => {
    await redis.set("2025-10-31", JSON.stringify({ USDCHF: 1.1, USDEUR: 1 }));
    await redis.set("2025-11-30", JSON.stringify({ USDCHF: 1.05, USDEUR: 1 }));

    const account = buildAccount({
      id: "account-1",
      name: "Holding Account",
      type: AccountType.ASSET,
      accountBookId: "account-book-1",
      unit: Unit.CURRENCY,
      currency: "EUR",
      groupId: "assets",
    });
    await prisma.account.create({ data: account });

    await prisma.transaction.create({
      data: buildTransaction({ id: "tx-1", accountBookId: "account-book-1" }),
    });
    const bookings = [
      buildBooking({
        id: "booking-1",
        transactionId: "tx-1",
        accountBookId: "account-book-1",
        accountId: "account-1",
        date: new Date("2025-10-12"),
        value: new Decimal(1000),
        unit: Unit.CURRENCY,
        currency: "EUR",
      }),
    ];
    await prisma.booking.createMany({ data: bookings });

    const result = await generateHoldingBookingsForAccount(
      await prisma.accountBook.findUniqueOrThrow({
        where: { id: "account-book-1" },
      }),
      { ...account, bookings: [] },
      new Date("2025-11-01"),
      new Date("2025-11-30"),
    );

    expect(result).toEqual([
      expect.objectContaining<Partial<Booking>>({
        date: new Date("2025-11-30"),
        value: new Decimal(50),
        unit: Unit.CURRENCY,
        currency: "CHF",
      }),
    ]);
  });
});
