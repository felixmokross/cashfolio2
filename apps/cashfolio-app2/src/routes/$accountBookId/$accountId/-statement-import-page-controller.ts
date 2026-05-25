import {
  getBookingPeriodValue,
  getLatestBookingDate,
} from "@/shared/transaction-period";
import type { LedgerSearch } from "./-page-types";
import type { TransactionMutationValues } from "./-page-view";

export function getStatementImportSuccessLedgerSearch(args: {
  selectedPeriodValue?: string;
  transactions: TransactionMutationValues[];
  createdTransactions: { id: string }[];
}): LedgerSearch {
  const latestImportedTransaction = args.transactions.reduce<{
    date: Date;
    index: number;
  } | null>((latest, transaction, index) => {
    const nextDate = getLatestBookingDate(transaction.bookings);
    if (!nextDate) return latest;
    if (!latest || nextDate > latest.date) {
      return { date: nextDate, index };
    }
    return latest;
  }, null);
  const latestBookingDate = latestImportedTransaction?.date ?? null;
  const transactionId =
    args.selectedPeriodValue && latestImportedTransaction
      ? (args.createdTransactions[latestImportedTransaction.index]?.id ??
        args.createdTransactions.at(-1)?.id)
      : args.createdTransactions.at(-1)?.id;
  const period =
    args.selectedPeriodValue && latestBookingDate
      ? getBookingPeriodValue({
          date: latestBookingDate,
          currentPeriodValue: args.selectedPeriodValue,
        })
      : args.selectedPeriodValue;

  return {
    period,
    transactionId,
  };
}
