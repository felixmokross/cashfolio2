import { beforeEach, expect, test, vi } from "vitest";
import { getEquityAccountIncome } from "./get-equity-account-income.server";
import { prisma } from "~/prisma.server";
import { buildAccountBook } from "~/account-books/builders";
import { buildAccount } from "~/accounts/builders";
import { AccountType } from "~/.prisma-client/enums";
import { buildBooking, buildTransaction } from "~/transactions/builders";
import { Decimal } from "@prisma/client/runtime/library";
import { redis } from "~/redis.server";
import { parseISO } from "date-fns";
import { buildAccountGroup } from "~/account-groups/builders";

beforeEach(async () => {
  // clean up
  await redis.flushAll();

  await prisma.accountBook.deleteMany({});

  await prisma.accountBook.create({
    data: buildAccountBook({ id: "my-account-book", referenceCurrency: "CHF" }),
  });
});

test("returns the income per equity account", async () => {
  await redis.set("2025-11-15", JSON.stringify({ USDCHF: 1.1, USDEUR: 1 }));

  await prisma.accountGroup.create({
    data: buildAccountGroup({
      id: "equity",
      type: AccountType.EQUITY,
      accountBookId: "my-account-book",
    }),
  });
  await prisma.account.create({
    data: buildAccount({
      id: "salary",
      type: AccountType.EQUITY,
      accountBookId: "my-account-book",
      groupId: "equity",
    }),
  });
  await prisma.transaction.create({
    data: buildTransaction({
      accountBookId: "my-account-book",
      id: "transaction-1",
    }),
  });
  await prisma.booking.create({
    data: buildBooking({
      date: parseISO("2025-11-15"),
      transactionId: "transaction-1",
      accountBookId: "my-account-book",
      accountId: "salary",
      unit: "CURRENCY",
      currency: "CHF",
      value: new Decimal(10000),
    }),
  });

  await prisma.account.create({
    data: buildAccount({
      id: "groceries",
      type: AccountType.EQUITY,
      accountBookId: "my-account-book",
      groupId: "equity",
    }),
  });
  await prisma.transaction.create({
    data: buildTransaction({
      accountBookId: "my-account-book",
      id: "transaction-2",
    }),
  });
  await prisma.booking.createMany({
    data: [
      buildBooking({
        date: parseISO("2025-11-10"),
        transactionId: "transaction-2",
        accountBookId: "my-account-book",
        accountId: "groceries",
        unit: "CURRENCY",
        currency: "CHF",
        value: new Decimal(-200),
      }),
      buildBooking({
        date: parseISO("2025-11-15"),
        transactionId: "transaction-2",
        accountBookId: "my-account-book",
        accountId: "groceries",
        unit: "CURRENCY",
        currency: "EUR",
        value: new Decimal(-150),
      }),
    ],
  });

  await prisma.account.create({
    data: buildAccount({
      id: "rent",
      type: AccountType.EQUITY,
      accountBookId: "my-account-book",
      groupId: "equity",
    }),
  });
  await prisma.transaction.create({
    data: buildTransaction({
      accountBookId: "my-account-book",
      id: "transaction-3",
    }),
  });
  await prisma.booking.create({
    data: buildBooking({
      date: parseISO("2025-11-01"),
      transactionId: "transaction-3",
      accountBookId: "my-account-book",
      accountId: "rent",
      unit: "CURRENCY",
      currency: "CHF",
      value: new Decimal(-2000),
    }),
  });

  const result = await getEquityAccountIncome(
    "my-account-book",
    parseISO("2025-11-01"),
    parseISO("2025-11-30"),
  );

  expect(result).toEqual(
    new Map([
      ["salary", new Decimal(10000)],
      ["groceries", new Decimal(-365)],
      ["rent", new Decimal(-2000)],
    ]),
  );
});
