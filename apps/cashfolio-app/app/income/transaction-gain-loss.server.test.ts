import { beforeEach, describe, expect, test } from "vitest";
import {
  buildBooking,
  buildTransactionWithBookings,
} from "~/transactions/builders";
import {
  generateTransactionGainLossBooking,
  generateTransactionGainLossBookings,
  TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
} from "./transaction-gain-loss.server";
import { Decimal } from "@prisma/client-runtime-utils";
import {
  AccountType,
  Unit,
  type Account,
  type Booking,
} from "~/.prisma-client/client";
import { redis } from "~/redis.server";
import { prisma } from "~/prisma.server";
import { parseISO } from "date-fns";
import {
  createTestAccount,
  createTestTransaction,
  testAccountBook,
} from "test-setup";

describe("generateTransactionGainLossBookings", () => {
  let account1: Account = undefined!;
  let account2: Account = undefined!;

  beforeEach(async () => {
    account1 = await createTestAccount({ type: AccountType.EQUITY });
    account2 = await createTestAccount({ type: AccountType.EQUITY });
  });

  test("returns transaction gain/loss bookings for given account book and date range", async () => {
    await redis.ts.add(`fx:CHF`, parseISO("2025-11-15").getTime(), 1.1);
    await redis.ts.add(`fx:EUR`, parseISO("2025-11-15").getTime(), 1);

    const transaction = await createTestTransaction(
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

    const result = await generateTransactionGainLossBookings(
      await prisma.accountBook.findUniqueOrThrow({
        where: { id: testAccountBook.id },
      }),
      parseISO("2025-11-14"),
      parseISO("2025-11-16"),
    );

    expect(result).toEqual([
      expect.objectContaining<Partial<Booking>>({
        date: parseISO("2025-11-15"),
        id: `transaction-gain-loss-${transaction.id}`,
        accountBookId: testAccountBook.id,
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
    await redis.ts.add(`fx:CHF`, parseISO("2025-01-02").getTime(), 1.1);
    await redis.ts.add(`fx:EUR`, parseISO("2025-01-02").getTime(), 1);

    const transaction = buildTransactionWithBookings({
      id: "tx-1",
      accountBookId: "account-book-1",
      bookings: [
        buildBooking({
          date: parseISO("2025-01-01"),
          unit: Unit.CURRENCY,
          currency: "CHF",
          value: new Decimal(-1070),
        }),
        buildBooking({
          date: parseISO("2025-01-02"),
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
        date: parseISO("2025-01-02"),
        id: "transaction-gain-loss-tx-1",
        accountId: TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
        unit: Unit.CURRENCY,
        currency: "CHF",
        value: new Decimal(-30),
      }),
    );
  });
});
