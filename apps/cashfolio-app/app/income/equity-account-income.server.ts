import { prisma } from "~/prisma.server";
import { AccountType } from "~/.prisma-client/enums";
import { getCurrencyUnitInfo } from "~/units/functions";
import { Decimal } from "@prisma/client/runtime/library";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import { subDays } from "date-fns";
import type { Income } from "./types";
import { generateTransactionGainLossAccount } from "./transaction-gain-loss.server";
import {
  generateHoldingGainLossAccount,
  generateHoldingGainLossAccountGroups,
  getHoldingAccounts,
} from "./holding-gain-loss.server";
import type { Account } from "~/.prisma-client/client";

export async function getEquityAccountIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
): Promise<Income> {
  const accountBook = await prisma.accountBook.findUniqueOrThrow({
    where: { id: accountBookId },
  });

  const holdingAccounts = await getHoldingAccounts(accountBookId);

  const accounts = await getAccounts(
    accountBookId,
    fromDate,
    toDate,
    holdingAccounts,
  );
  const accountGroups = await getAccountGroups(accountBookId, holdingAccounts);

  const incomeByAccountId = new Map<string, Decimal>();
  for (const account of accounts) {
    const balanceAtStart = await getBalanceCached(
      accountBookId,
      account.id,
      getCurrencyUnitInfo(accountBook.referenceCurrency),
      subDays(fromDate, 1),
    );

    const balanceAtEnd = await getBalanceCached(
      accountBookId,
      account.id,
      getCurrencyUnitInfo(accountBook.referenceCurrency),
      toDate,
    );

    incomeByAccountId.set(account.id, balanceAtEnd.sub(balanceAtStart));
  }

  return {
    incomeByAccountId,
    accounts,
    accountGroups,
  };
}

async function getAccounts(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
  holdingAccounts: Account[],
) {
  return [
    ...(await getEquityAccounts(accountBookId, fromDate, toDate)),
    generateTransactionGainLossAccount(
      await prisma.accountGroup.findFirstOrThrow({
        where: { accountBookId, type: AccountType.EQUITY, parentGroupId: null },
      }),
    ),
    ...holdingAccounts.map((a) => generateHoldingGainLossAccount(a)),
  ];
}

async function getAccountGroups(
  accountBookId: string,
  holdingAccounts: Account[],
) {
  return [
    ...(await getEquityAccountGroups(accountBookId)),
    ...(await generateHoldingGainLossAccountGroups(
      accountBookId,
      holdingAccounts,
    )),
  ];
}

async function getEquityAccounts(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
) {
  return await prisma.account.findMany({
    where: {
      accountBookId,
      type: AccountType.EQUITY,
      bookings: { some: { date: { gte: fromDate, lte: toDate } } },
    },
  });
}

async function getEquityAccountGroups(accountBookId: string) {
  return await prisma.accountGroup.findMany({
    // Currently we include all equity groups – to filter only relevant ones we'll need a open/close date, going through the group tree would be ineffecient
    where: { accountBookId, type: AccountType.EQUITY },
  });
}
