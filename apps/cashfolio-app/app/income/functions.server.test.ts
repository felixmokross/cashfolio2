import { beforeEach, describe, expect, test } from "vitest";
import { getIncome } from "./functions.server";
import { Decimal } from "@prisma/client/runtime/library";
import { buildAccount } from "~/accounts/builders";
import { prisma } from "~/prisma.server";
import { buildBooking, buildTransaction } from "~/transactions/builders";
import { AccountType, Unit } from "~/.prisma-client/enums";
import { redis } from "~/redis.server";
import { buildAccountBook } from "~/account-books/builders";
import { buildAccountGroup } from "~/account-groups/builders";
import { parseISO } from "date-fns/parseISO";

describe("getIncome", () => {
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

  test("returns holding gain/loss", async () => {
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

    const result = await getIncome(
      "account-book-1",
      new Date("2025-11-01"),
      new Date("2025-11-30"),
    );

    expect(result).toEqual(
      new Map([["holding-gain-loss-account-1", new Decimal(50)]]),
    );
  });

  test("returns equity account income", async () => {
    await prisma.accountGroup.create({
      data: buildAccountGroup({
        id: "equity",
        type: AccountType.EQUITY,
        accountBookId: "account-book-1",
      }),
    });
    await prisma.account.create({
      data: buildAccount({
        id: "rent",
        type: AccountType.EQUITY,
        accountBookId: "account-book-1",
        groupId: "equity",
      }),
    });
    await prisma.transaction.create({
      data: buildTransaction({
        accountBookId: "account-book-1",
        id: "transaction-3",
      }),
    });
    await prisma.booking.create({
      data: buildBooking({
        date: parseISO("2025-11-01"),
        transactionId: "transaction-3",
        accountBookId: "account-book-1",
        accountId: "rent",
        unit: "CURRENCY",
        currency: "CHF",
        value: new Decimal(-2000),
      }),
    });

    const result = await getIncome(
      "account-book-1",
      new Date("2025-11-01"),
      new Date("2025-11-30"),
    );

    expect(result).toEqual(new Map([["rent", new Decimal(-2000)]]));
  });
});
