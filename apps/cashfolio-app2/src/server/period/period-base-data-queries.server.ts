import { AccountType, EquityAccountSubtype } from "../../.prisma-client/enums";
import { prisma } from "../../prisma.server";
import { toMoneyNumber } from "../../shared/money";
import type {
  PeriodBaseCashFlowTransaction,
  PeriodBaseEquityBooking,
  PeriodBaseHoldingTransaction,
} from "./period-base-data-types";

export async function loadPeriodEquityBookingsRaw(args: {
  accountBookId: string;
  queryStart: Date;
  queryEndExclusive: Date;
  equityAccountById: Map<
    string,
    {
      id: string;
      name: string;
      groupId: string | null;
      equityAccountSubtype: EquityAccountSubtype | null;
    }
  >;
  equityAccountIds: string[];
}): Promise<PeriodBaseEquityBooking[]> {
  const usesPreloadedEquityAccountFilter = args.equityAccountIds.length > 0;
  const results: PeriodBaseEquityBooking[] = [];
  let nextBookingIdCursor: string | undefined;

  while (true) {
    const bookingsPage = await prisma.booking.findMany({
      where: {
        accountBookId: args.accountBookId,
        date: {
          gte: args.queryStart,
          lt: args.queryEndExclusive,
        },
        ...(usesPreloadedEquityAccountFilter
          ? {
              accountId: {
                in: args.equityAccountIds,
              },
            }
          : {
              account: {
                type: AccountType.EQUITY,
                equityAccountSubtype: {
                  in: [
                    EquityAccountSubtype.INCOME,
                    EquityAccountSubtype.EXPENSE,
                    EquityAccountSubtype.GAIN_LOSS,
                  ],
                },
              },
            }),
      },
      orderBy: { id: "asc" },
      take: 1_000,
      ...(nextBookingIdCursor
        ? {
            cursor: {
              id_accountBookId: {
                id: nextBookingIdCursor,
                accountBookId: args.accountBookId,
              },
            },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        accountId: true,
        transactionId: true,
        date: true,
        value: true,
        unit: true,
        currency: true,
        cryptocurrency: true,
        symbol: true,
        tradeCurrency: true,
        ...(usesPreloadedEquityAccountFilter
          ? {}
          : {
              account: {
                select: {
                  id: true,
                  name: true,
                  groupId: true,
                  equityAccountSubtype: true,
                },
              },
            }),
      },
    });

    if (bookingsPage.length === 0) {
      break;
    }

    nextBookingIdCursor = bookingsPage[bookingsPage.length - 1].id;

    for (const booking of bookingsPage) {
      const bookingAccountId = booking.accountId ?? booking.account?.id;
      if (!bookingAccountId) {
        throw new Error(
          "Equity booking invariant violated: booking is missing accountId.",
        );
      }

      const account =
        args.equityAccountById.get(bookingAccountId) ??
        (booking.account &&
        booking.account.id &&
        booking.account.name &&
        (booking.account.equityAccountSubtype === EquityAccountSubtype.INCOME ||
          booking.account.equityAccountSubtype ===
            EquityAccountSubtype.EXPENSE ||
          booking.account.equityAccountSubtype ===
            EquityAccountSubtype.GAIN_LOSS)
          ? {
              id: booking.account.id,
              name: booking.account.name,
              groupId: booking.account.groupId ?? null,
              equityAccountSubtype: booking.account.equityAccountSubtype,
            }
          : null);
      if (
        !account ||
        (account.equityAccountSubtype !== EquityAccountSubtype.INCOME &&
          account.equityAccountSubtype !== EquityAccountSubtype.EXPENSE &&
          account.equityAccountSubtype !== EquityAccountSubtype.GAIN_LOSS)
      ) {
        throw new Error(
          `Equity booking invariant violated for account ${bookingAccountId}: missing preloaded equity account metadata.`,
        );
      }

      results.push({
        id: booking.id,
        accountId: bookingAccountId,
        accountName: account.name,
        accountGroupId: account.groupId,
        equityAccountSubtype: account.equityAccountSubtype,
        transactionId: booking.transactionId,
        date: booking.date,
        value: toMoneyNumber(booking.value),
        unit: booking.unit,
        currency: booking.currency,
        cryptocurrency: booking.cryptocurrency,
        symbol: booking.symbol,
        tradeCurrency: booking.tradeCurrency,
      });
    }

    if (bookingsPage.length < 1_000) {
      break;
    }
  }

  return results;
}

export async function loadPeriodHoldingTransactionsRaw(args: {
  accountBookId: string;
  holdingAccountIds: string[];
  queryStart: Date;
  queryEndExclusive: Date;
}): Promise<PeriodBaseHoldingTransaction[]> {
  const results: PeriodBaseHoldingTransaction[] = [];
  if (args.holdingAccountIds.length === 0) {
    return results;
  }

  let nextTransactionIdCursor: string | undefined;

  while (true) {
    const transactionsPage = await prisma.transaction.findMany({
      where: {
        accountBookId: args.accountBookId,
        AND: [
          {
            bookings: {
              some: {
                accountId: {
                  in: args.holdingAccountIds,
                },
                date: {
                  gte: args.queryStart,
                  lt: args.queryEndExclusive,
                },
              },
            },
          },
          {
            bookings: {
              none: {
                date: {
                  gte: args.queryEndExclusive,
                },
              },
            },
          },
          {
            bookings: {
              none: {
                account: {
                  type: AccountType.EQUITY,
                  equityAccountSubtype: EquityAccountSubtype.OPENING_BALANCES,
                },
              },
            },
          },
        ],
      },
      orderBy: { id: "asc" },
      take: 200,
      ...(nextTransactionIdCursor
        ? {
            cursor: {
              id_accountBookId: {
                id: nextTransactionIdCursor,
                accountBookId: args.accountBookId,
              },
            },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        bookings: {
          select: {
            id: true,
            accountId: true,
            date: true,
            value: true,
            unit: true,
            currency: true,
            cryptocurrency: true,
            symbol: true,
            tradeCurrency: true,
            account: {
              select: {
                type: true,
                equityAccountSubtype: true,
              },
            },
          },
          orderBy: [{ date: "asc" }, { id: "asc" }],
        },
      },
    });

    if (transactionsPage.length === 0) {
      break;
    }

    for (const transaction of transactionsPage) {
      results.push({
        id: transaction.id,
        bookings: transaction.bookings.map((booking) => ({
          id: booking.id,
          accountId: booking.accountId,
          date: booking.date,
          value: toMoneyNumber(booking.value),
          unit: booking.unit,
          currency: booking.currency,
          cryptocurrency: booking.cryptocurrency,
          symbol: booking.symbol,
          tradeCurrency: booking.tradeCurrency,
          accountType: booking.account.type,
          equityAccountSubtype: booking.account.equityAccountSubtype,
        })),
      });
    }

    nextTransactionIdCursor = transactionsPage[transactionsPage.length - 1].id;
    if (transactionsPage.length < 200) {
      break;
    }
  }

  return results;
}

export async function loadPeriodCashFlowTransactionsRaw(args: {
  accountBookId: string;
  cashAccountIds: string[];
  queryStart: Date;
  queryEndExclusive: Date;
}): Promise<PeriodBaseCashFlowTransaction[]> {
  const results: PeriodBaseCashFlowTransaction[] = [];
  if (args.cashAccountIds.length === 0) {
    return results;
  }

  let nextTransactionIdCursor: string | undefined;

  while (true) {
    const transactionsPage = await prisma.transaction.findMany({
      where: {
        accountBookId: args.accountBookId,
        AND: [
          {
            bookings: {
              some: {
                accountId: { in: args.cashAccountIds },
                date: {
                  gte: args.queryStart,
                  lt: args.queryEndExclusive,
                },
              },
            },
          },
          {
            bookings: {
              none: {
                account: {
                  type: AccountType.EQUITY,
                  equityAccountSubtype: EquityAccountSubtype.OPENING_BALANCES,
                },
              },
            },
          },
        ],
      },
      orderBy: { id: "asc" },
      take: 200,
      ...(nextTransactionIdCursor
        ? {
            cursor: {
              id_accountBookId: {
                id: nextTransactionIdCursor,
                accountBookId: args.accountBookId,
              },
            },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        bookings: {
          select: {
            id: true,
            date: true,
            value: true,
            unit: true,
            currency: true,
            cryptocurrency: true,
            symbol: true,
            tradeCurrency: true,
            account: {
              select: {
                type: true,
                isCashAccount: true,
              },
            },
          },
          orderBy: [{ date: "asc" }, { id: "asc" }],
        },
      },
    });

    if (transactionsPage.length === 0) {
      break;
    }

    for (const transaction of transactionsPage) {
      results.push({
        id: transaction.id,
        bookings: transaction.bookings.map((booking) => ({
          id: booking.id,
          date: booking.date,
          value: toMoneyNumber(booking.value),
          unit: booking.unit,
          currency: booking.currency,
          cryptocurrency: booking.cryptocurrency,
          symbol: booking.symbol,
          tradeCurrency: booking.tradeCurrency,
          account: {
            type: booking.account.type,
            isCashAccount: booking.account.isCashAccount,
          },
        })),
      });
    }

    nextTransactionIdCursor = transactionsPage[transactionsPage.length - 1].id;
    if (transactionsPage.length < 200) {
      break;
    }
  }

  return results;
}
