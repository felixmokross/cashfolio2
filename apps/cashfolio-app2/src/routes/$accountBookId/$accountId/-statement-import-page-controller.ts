import {
  getBookingPeriodValue,
  getLatestBookingDate,
} from "@/shared/transaction-period";
import type { LedgerSearch } from "./-page-types";
import type { TransactionMutationValues } from "./-page-view";
import type {
  StatementImportDraft,
  StatementImportDraftStatus,
} from "./-statement-import";

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

export function getStatementImportIncludedDrafts(
  drafts: StatementImportDraft[],
): StatementImportDraft[] {
  return drafts.filter((draft) => !draft.ignored);
}

export function getStatementImportReadyCount(args: {
  drafts: StatementImportDraft[];
  statuses: Map<string, StatementImportDraftStatus>;
}): number {
  return getStatementImportIncludedDrafts(args.drafts).filter(
    (draft) => args.statuses.get(draft.id)?.kind === "ready",
  ).length;
}

export function getStatementImportIgnoredCount(
  drafts: StatementImportDraft[],
): number {
  return drafts.length - getStatementImportIncludedDrafts(drafts).length;
}

export function getStatementImportSummaryText(args: {
  drafts: StatementImportDraft[];
  readyCount: number;
  ignoredCount: number;
}): string {
  if (args.drafts.length === 0) {
    return "No statement loaded";
  }

  const ignoredSuffix =
    args.ignoredCount > 0 ? `, ${args.ignoredCount} ignored` : "";
  return `${args.readyCount} of ${args.drafts.length} ready${ignoredSuffix}`;
}

export function getStatementImportBulkIgnoredActionLabel(args: {
  shouldIgnore: boolean;
  selectedDraftCount: number;
}): string {
  const action = args.shouldIgnore ? "Ignore" : "Unignore";
  const rowLabel = args.selectedDraftCount === 1 ? "row" : "rows";
  return `${action} ${args.selectedDraftCount} selected ${rowLabel}`;
}

export function getStatementImportTransactionsToSubmit(
  drafts: StatementImportDraft[],
): TransactionMutationValues[] {
  return getStatementImportIncludedDrafts(drafts).map(
    (draft) => draft.transaction,
  );
}

export function isStatementImportDisabled(args: {
  drafts: StatementImportDraft[];
  readyCount: number;
  isSubmitting: boolean;
  isEditSubmitting: boolean;
}): boolean {
  const includedDrafts = getStatementImportIncludedDrafts(args.drafts);
  return (
    args.isSubmitting ||
    args.isEditSubmitting ||
    includedDrafts.length === 0 ||
    args.readyCount !== includedDrafts.length
  );
}

export function toggleStatementImportDraftIgnored(
  drafts: StatementImportDraft[],
  draftId: string,
): StatementImportDraft[] {
  return drafts.map((draft) =>
    draft.id === draftId ? { ...draft, ignored: !draft.ignored } : draft,
  );
}

export function setStatementImportDraftsIgnored(args: {
  drafts: StatementImportDraft[];
  draftIds: string[];
  ignored: boolean;
}): StatementImportDraft[] {
  const draftIds = new Set(args.draftIds);
  return args.drafts.map((draft) => {
    if (!draftIds.has(draft.id) || draft.ignored === args.ignored) {
      return draft;
    }

    return {
      ...draft,
      ignored: args.ignored,
    };
  });
}
