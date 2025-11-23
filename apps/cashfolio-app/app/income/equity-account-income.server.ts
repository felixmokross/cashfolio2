import { prisma } from "~/prisma.server";
import { AccountType } from "~/.prisma-client/enums";
import { getCurrencyUnitInfo } from "~/units/functions";
import { Decimal } from "@prisma/client/runtime/library";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import { subDays } from "date-fns";
import type { Income } from "./types";

export async function getEquityAccountIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
): Promise<Income> {
  const accountBook = await prisma.accountBook.findUniqueOrThrow({
    where: { id: accountBookId },
    include: {
      accounts: {
        where: {
          type: AccountType.EQUITY,
          bookings: { some: { date: { gte: fromDate, lte: toDate } } },
        },
      },
      // Currently we include all equity groups – to filter only relevant ones we'll need a open/close date, going through the group tree would be ineffecient
      groups: { where: { type: AccountType.EQUITY } },
    },
  });

  const incomeByAccountId = new Map<string, Decimal>();
  for (const account of accountBook.accounts) {
    const balanceAtEnd = await getBalanceCached(
      accountBookId,
      account.id,
      getCurrencyUnitInfo(accountBook.referenceCurrency),
      toDate,
    );

    const balanceAtStart = await getBalanceCached(
      accountBookId,
      account.id,
      getCurrencyUnitInfo(accountBook.referenceCurrency),
      subDays(fromDate, 1),
    );

    incomeByAccountId.set(account.id, balanceAtEnd.sub(balanceAtStart));
  }

  return {
    incomeByAccountId,
    accounts: accountBook.accounts,
    accountGroups: accountBook.groups,
  };
}
