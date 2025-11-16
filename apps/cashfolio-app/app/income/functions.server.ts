import { AccountType, Unit } from "~/.prisma-client/enums";
import { prisma } from "~/prisma.server";
import {
  generateHoldingBookingsForAccount,
  generateHoldingGainLossAccount,
} from "./holding-gain-loss.server";
import { sum } from "~/utils.server";
import type { Decimal } from "@prisma/client/runtime/library";
import { getEquityAccountIncome } from "./get-equity-account-income.server";

export async function getIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
) {
  const accountBook = await prisma.accountBook.findUniqueOrThrow({
    where: { id: accountBookId },
  });
  const incomeByAccountId = new Map<string, Decimal>();

  const holdingAccounts = await prisma.account.findMany({
    where: {
      accountBookId: accountBook.id,
      type: { in: [AccountType.ASSET, AccountType.LIABILITY] },
      NOT: {
        unit: Unit.CURRENCY,
        currency: accountBook.referenceCurrency,
      },
    },
    include: { bookings: { where: { date: { gte: fromDate, lte: toDate } } } },
  });

  for (const holdingAccount of holdingAccounts) {
    const holdingGainLossAccount =
      generateHoldingGainLossAccount(holdingAccount);
    const bookings = await generateHoldingBookingsForAccount(
      accountBook,
      holdingAccount,
      fromDate,
      toDate,
    );
    incomeByAccountId.set(
      holdingGainLossAccount.id,
      sum(bookings.map((b) => b.value)),
    );
  }

  const equityAccountIncome = await getEquityAccountIncome(
    accountBook.id,
    fromDate,
    toDate,
  );

  return new Map<string, Decimal>([
    ...equityAccountIncome,
    ...incomeByAccountId,
  ]);
}
