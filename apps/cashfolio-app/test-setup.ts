import { createId } from "@paralleldrive/cuid2";
import { Decimal } from "@prisma/client/runtime/library";
import { parseISO } from "date-fns";
import type { connect } from "http2";
import { beforeEach } from "vitest";
import {
  AccountType,
  type Account,
  type AccountBook,
} from "~/.prisma-client/client";
import { Unit } from "~/.prisma-client/enums";
import { prisma } from "~/prisma.server";
import { redis } from "~/redis.server";

export let testAccountBook: AccountBook = undefined!;

beforeEach(async () => {
  // clean up
  await redis.flushAll();

  await prisma.accountBook.deleteMany({});

  // create basic account book
  testAccountBook = await prisma.accountBook.create({
    data: {
      id: createId(),
      name: "Test Account Book",
      referenceCurrency: "CHF",
      groups: {
        create: [
          { name: "Assets", type: AccountType.ASSET },
          { name: "Liabilities", type: AccountType.LIABILITY },
          { name: "Equity", type: AccountType.EQUITY },
        ],
      },
    },
  });
});

export async function createTestAccount(
  type: AccountType,
  ...transactions: Omit<CreateTestTransactionBookingArg, "accountId">[]
) {
  const rootGroupForType = await prisma.accountGroup.findFirstOrThrow({
    where: { accountBookId: testAccountBook.id, type, parentGroupId: null },
  });

  const account = await prisma.account.create({
    data: {
      name: `Account ${type}`,
      type,
      groupId: rootGroupForType.id,
      accountBookId: testAccountBook.id,
    },
  });

  for (const transaction of transactions) {
    await createTestTransaction({ ...transaction, accountId: account.id });
  }

  return account;
}

type CreateTestTransactionBookingArg = {
  date: string;
  accountId: string;
  currency: string;
  value: number;
};

export async function createTestTransaction(
  ...bookings: CreateTestTransactionBookingArg[]
) {
  return await prisma.transaction.create({
    data: {
      accountBookId: testAccountBook.id,
      description: "",
      bookings: {
        create: bookings.map((b) => ({
          date: parseISO(b.date),
          description: "",
          accountId: b.accountId,
          unit: Unit.CURRENCY,
          currency: b.currency,
          value: new Decimal(b.value),
        })),
      },
    },
  });
}
