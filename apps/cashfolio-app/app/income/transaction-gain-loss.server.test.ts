import { beforeEach, describe, expect, test } from "vitest";
import {
  buildBooking,
  buildTransaction,
  buildTransactionWithBookings,
} from "~/transactions/builders";
import {
  generateTransactionGainLossBooking,
  generateTransactionGainLossBookings,
  TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
} from "./transaction-gain-loss.server";
import { Decimal } from "@prisma/client/runtime/library";
import { Unit, type Booking } from "~/.prisma-client/client";
import { redis } from "~/redis.server";
import { prisma } from "~/prisma.server";
import { parseISO } from "date-fns";
import { buildAccountBook } from "~/account-books/builders";
import { buildAccount } from "~/accounts/builders";
import { buildAccountGroup } from "~/account-groups/builders";

describe("generateTransactionGainLossBookings", () => {
  beforeEach(async () => {
    await prisma.accountBook.deleteMany({});

    await prisma.accountBook.create({
      data: buildAccountBook({
        id: "account-book-1",
        referenceCurrency: "CHF",
      }),
    });

    await prisma.accountGroup.create({
      data: buildAccountGroup({
        id: "equity",
        type: "EQUITY",
        accountBookId: "account-book-1",
      }),
    });

    await prisma.account.createMany({
      data: [
        buildAccount({
          accountBookId: "account-book-1",
          id: "acc-1",
          groupId: "equity",
        }),
        buildAccount({
          accountBookId: "account-book-1",
          id: "acc-2",
          groupId: "equity",
        }),
      ],
    });
  });

  test("returns transaction gain/loss bookings for given account book and date range", async () => {
    await redis.set("2025-11-15", JSON.stringify({ USDCHF: 1.1, USDEUR: 1 }));

    await prisma.transaction.create({
      data: buildTransaction({
        id: "tx-1",
        accountBookId: "account-book-1",
      }),
    });

    await prisma.booking.createMany({
      data: [
        buildBooking({
          transactionId: "tx-1",
          accountBookId: "account-book-1",
          accountId: "acc-1",
          date: new Date("2025-11-15"),
          unit: Unit.CURRENCY,
          currency: "CHF",
          value: new Decimal(-1070),
        }),
        buildBooking({
          transactionId: "tx-1",
          accountBookId: "account-book-1",
          accountId: "acc-2",
          date: new Date("2025-11-15"),
          unit: Unit.CURRENCY,
          currency: "EUR",
          value: new Decimal(1000),
        }),
      ],
    });

    const result = await generateTransactionGainLossBookings(
      await prisma.accountBook.findUniqueOrThrow({
        where: { id: "account-book-1" },
      }),
      parseISO("2025-11-14"),
      parseISO("2025-11-16"),
    );

    expect(result).toEqual([
      expect.objectContaining<Partial<Booking>>({
        date: new Date("2025-11-15"),
        id: "transaction-gain-loss-tx-1",
        accountBookId: "account-book-1",
        accountId: TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
        unit: Unit.CURRENCY,
        currency: "CHF",
        value: new Decimal(-30),
      }),
    ]);
  });
});

describe("generateTransactionGainLossBooking", () => {
  test("returns a virtual booking with the transaction gain/loss for the given transaction", async () => {
    await redis.set("2025-01-02", JSON.stringify({ USDCHF: 1.1, USDEUR: 1 }));

    const transaction = buildTransactionWithBookings({
      id: "tx-1",
      accountBookId: "account-book-1",
      bookings: [
        buildBooking({
          date: new Date("2025-01-01"),
          unit: Unit.CURRENCY,
          currency: "CHF",
          value: new Decimal(-1070),
        }),
        buildBooking({
          date: new Date("2025-01-02"),
          unit: Unit.CURRENCY,
          currency: "EUR",
          value: new Decimal(1000),
        }),
      ],
    });

    const result = await generateTransactionGainLossBooking(
      "account-book-1",
      "CHF",
      transaction,
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<Booking>>({
        date: new Date("2025-01-02"),
        id: "transaction-gain-loss-tx-1",
        accountId: TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
        unit: Unit.CURRENCY,
        currency: "CHF",
        value: new Decimal(-30),
      }),
    );
  });
});
