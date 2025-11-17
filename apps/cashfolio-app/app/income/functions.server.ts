import { getHoldingGainLoss } from "./holding-gain-loss.server";
import type { Decimal } from "@prisma/client/runtime/library";
import { getEquityAccountIncome } from "./equity-account-income.server";
import {
  getTransactionGainLoss,
  TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
} from "./transaction-gain-loss.server";

export async function getIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
) {
  return new Map<string, Decimal>([
    ...(await getEquityAccountIncome(accountBookId, fromDate, toDate)),
    ...(await getHoldingGainLoss(accountBookId, fromDate, toDate)),
    [
      TRANSACTION_GAIN_LOSS_ACCOUNT_ID,
      await getTransactionGainLoss(accountBookId, fromDate, toDate),
    ],
  ]);
}
