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
  const latestBookingDate = args.transactions.reduce<Date | null>(
    (latest, transaction) => {
      const nextDate = getLatestBookingDate(transaction.bookings);
      if (!nextDate) return latest;
      if (!latest || nextDate > latest) return nextDate;
      return latest;
    },
    null,
  );
  const period =
    args.selectedPeriodValue && latestBookingDate
      ? getBookingPeriodValue({
          date: latestBookingDate,
          currentPeriodValue: args.selectedPeriodValue,
        })
      : args.selectedPeriodValue;

  return {
    period,
    transactionId: args.createdTransactions.at(-1)?.id,
  };
}
