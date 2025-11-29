import { beforeEach, expect, test, vi } from "vitest";
import { buildAccountBook } from "~/account-books/builders";
import { getBalanceSheet } from "./functions.server";
import { buildAccountGroup } from "~/account-groups/builders";
import { AccountType } from "~/.prisma-client/enums";
import { Decimal } from "@prisma/client/runtime/library";
import { buildAccount } from "~/accounts/builders";
import { prisma } from "~/prisma.server";
import {
  buildBooking,
  buildTransactionWithBookings,
} from "~/transactions/builders";

vi.mock("~/prisma.server", () => ({
  prisma: {
    accountBook: { findUniqueOrThrow: vi.fn() },
    account: { findMany: vi.fn(() => []) },
    accountGroup: { findMany: vi.fn(() => []) },
    transaction: { findMany: vi.fn(() => []) },
    booking: { findMany: vi.fn(() => []) },
  },
}));

vi.mock("~/redis.server", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    exists: vi.fn(),
    ts: {
      add: vi.fn(),
      REVRANGE: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("returns correct account balances", async () => {
  const accountBook = buildAccountBook();
  const assetsAccountGroup = buildAccountGroup({
    type: AccountType.ASSET,
    accountBookId: accountBook.id,
  });
  const liabilitiesAccountGroup = buildAccountGroup({
    type: AccountType.LIABILITY,
    accountBookId: accountBook.id,
  });

  const account = buildAccount({
    groupId: assetsAccountGroup.id,
    accountBookId: accountBook.id,
  });

  vi.mocked(prisma.accountBook.findUniqueOrThrow).mockResolvedValue(
    accountBook,
  );
  vi.mocked(prisma.accountGroup.findMany).mockResolvedValue([
    assetsAccountGroup,
    liabilitiesAccountGroup,
  ]);
  vi.mocked(prisma.account.findMany).mockResolvedValue([account]);
  vi.mocked(prisma.booking.findMany).mockResolvedValue([
    buildBooking({ value: new Decimal(100) }),
    buildBooking({ value: new Decimal(-30) }),
    buildBooking({ value: new Decimal(-10) }),
  ]);

  const date = new Date(Date.UTC(2025, 7, 31));

  const result = await getBalanceSheet(accountBook.id, date);

  expect(vi.mocked(prisma.booking.findMany)).toHaveBeenCalledWith({
    where: {
      date: { lte: date },
      accountId: account.id,
      accountBookId: accountBook.id,
    },
    orderBy: { date: "asc" },
  });

  expect(result).toEqual(
    expect.objectContaining({
      assets: expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({ id: account.id, balance: new Decimal(60) }),
        ]),
      }),
    }),
  );
});

test("returns a transfer clearing balance for uncleared transactions", async () => {
  const accountBook = buildAccountBook();
  const assetsAccountGroup = buildAccountGroup({
    type: AccountType.ASSET,
    accountBookId: accountBook.id,
  });
  const liabilitiesAccountGroup = buildAccountGroup({
    type: AccountType.LIABILITY,
    accountBookId: accountBook.id,
  });

  vi.mocked(prisma.accountBook.findUniqueOrThrow).mockResolvedValue(
    accountBook,
  );
  vi.mocked(prisma.accountGroup.findMany).mockResolvedValue([
    assetsAccountGroup,
    liabilitiesAccountGroup,
  ]);
  vi.mocked(prisma.transaction.findMany).mockResolvedValue([
    buildTransactionWithBookings({
      bookings: [
        buildBooking({
          date: new Date(Date.UTC(2025, 7, 31)),
          value: new Decimal(-200),
        }),
        buildBooking({
          date: new Date(Date.UTC(2025, 8, 1)),
          value: new Decimal(200),
        }),
      ],
    }),
  ]);

  const date = new Date(Date.UTC(2025, 7, 31));

  const result = await getBalanceSheet(accountBook.id, date);

  expect(vi.mocked(prisma.transaction.findMany)).toHaveBeenCalledWith({
    where: {
      accountBookId: accountBook.id,
      AND: [
        { bookings: { some: { date: { lte: date } } } },
        { bookings: { some: { date: { gt: date } } } },
      ],
    },
    include: { bookings: true },
  });

  expect(result).toEqual(
    expect.objectContaining({
      assets: expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            id: "transfer-clearing",
            balance: new Decimal(200),
          }),
        ]),
      }),
    }),
  );
});
