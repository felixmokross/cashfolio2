import { createId } from "@paralleldrive/cuid2";
import { Unit } from "../../src/.prisma-client/enums";
import { prisma } from "./db-client";
import {
  seedNonZeroConvertibleArchivedAndLiabilityBalancesWithPrisma,
  seedNonZeroConvertibleAssetBalancesWithPrisma,
} from "./valuation-balance-seeds";

export async function getTransactionBookingsByDescription(args: {
  accountBookId: string;
  description: string;
}): Promise<
  Array<{
    accountId: string;
    date: string;
    unit: Unit;
    symbol: string | null;
    tradeCurrency: string | null;
    value: number;
  }>
> {
  const transaction = await prisma.transaction.findFirstOrThrow({
    where: {
      accountBookId: args.accountBookId,
      description: args.description,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      bookings: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });

  return transaction.bookings.map((booking) => ({
    accountId: booking.accountId,
    date: booking.date.toISOString(),
    unit: booking.unit,
    symbol: booking.symbol,
    tradeCurrency: booking.tradeCurrency,
    value: Number(booking.value),
  }));
}

export async function seedThreeBookingSplitTransaction(args: {
  accountBookId: string;
  description: string;
  currentAccountId: string;
  debitAccountIds: [string, string];
  date?: string;
}) {
  const transactionId = createId();
  const bookingDate = new Date(args.date ?? "2026-01-04T00:00:00.000Z");

  await prisma.transaction.create({
    data: {
      id: transactionId,
      accountBookId: args.accountBookId,
      description: args.description,
      bookings: {
        create: [
          {
            id: createId(),
            accountId: args.currentAccountId,
            date: bookingDate,
            description: "",
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: -300,
            sortOrder: 0,
          },
          {
            id: createId(),
            accountId: args.debitAccountIds[0],
            date: bookingDate,
            description: "",
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: 100,
            sortOrder: 1,
          },
          {
            id: createId(),
            accountId: args.debitAccountIds[1],
            date: bookingDate,
            description: "",
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: 200,
            sortOrder: 2,
          },
        ],
      },
    },
  });
}

export async function seedNonZeroConvertibleAssetBalances(args: {
  accountBookId: string;
  counterAccountId: string;
}) {
  return seedNonZeroConvertibleAssetBalancesWithPrisma({
    prisma,
    accountBookId: args.accountBookId,
    counterAccountId: args.counterAccountId,
  });
}

export async function seedNonZeroConvertibleArchivedAndLiabilityBalances(args: {
  accountBookId: string;
  counterAccountId: string;
}) {
  return seedNonZeroConvertibleArchivedAndLiabilityBalancesWithPrisma({
    prisma,
    accountBookId: args.accountBookId,
    counterAccountId: args.counterAccountId,
  });
}

export async function seedTransactionsPageScenario(args: {
  accountBookId: string;
  cashAccountId: string;
  savingsAccountId: string;
  expenseAccountId: string;
}) {
  const olderTransactionId = createId();
  const newerTransactionId = createId();
  const olderDescription = "E2E Transactions Older";
  const newerDescription = "E2E Transactions Newer";

  await prisma.transaction.create({
    data: {
      id: olderTransactionId,
      accountBookId: args.accountBookId,
      description: olderDescription,
      bookings: {
        create: [
          {
            id: createId(),
            accountId: args.cashAccountId,
            date: new Date("2026-05-03T00:00:00.000Z"),
            description: `${olderDescription} Cash`,
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: 50,
            sortOrder: 0,
          },
          {
            id: createId(),
            accountId: args.savingsAccountId,
            date: new Date("2026-05-03T00:00:00.000Z"),
            description: `${olderDescription} Savings`,
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: -50,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.transaction.create({
    data: {
      id: newerTransactionId,
      accountBookId: args.accountBookId,
      description: newerDescription,
      bookings: {
        create: [
          {
            id: createId(),
            accountId: args.cashAccountId,
            date: new Date("2026-05-12T00:00:00.000Z"),
            description: `${newerDescription} Cash`,
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: 125,
            sortOrder: 0,
          },
          {
            id: createId(),
            accountId: args.expenseAccountId,
            date: new Date("2026-05-12T00:00:00.000Z"),
            description: `${newerDescription} Expense`,
            unit: Unit.CURRENCY,
            currency: "CHF",
            value: -125,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  return {
    olderTransactionId,
    newerTransactionId,
    olderDescription,
    newerDescription,
  };
}
