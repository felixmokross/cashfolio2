import { useMemo } from "react";
import type { AccountOption } from "@/components/edit-transaction-modal";
import type { LedgerAccount } from "./-page-types";
import {
  getStatementImportDraftStatus,
  type StatementImportDraft,
} from "./-statement-import";
import {
  getStatementImportGridRows,
  getStatementImportIgnoredCount,
  getStatementImportReadyCount,
  getStatementImportSummaryText,
  isStatementImportDisabled,
} from "./-statement-import-page-controller";

export function useStatementImportReviewDerivedState(args: {
  account: LedgerAccount;
  accountBookStartDate: Date;
  accountOptions: AccountOption[];
  persistedBalance: number;
  drafts: StatementImportDraft[];
  isSubmitting: boolean;
  isEditSubmitting: boolean;
}) {
  const {
    account,
    accountBookStartDate,
    accountOptions,
    persistedBalance,
    drafts,
    isSubmitting,
    isEditSubmitting,
  } = args;
  const counterAccountOptions = useMemo(
    () => accountOptions.filter((option) => option.value !== account.id),
    [account.id, accountOptions],
  );
  const statuses = useMemo(
    () =>
      new Map(
        drafts.map((draft) => [
          draft.id,
          getStatementImportDraftStatus({
            draft,
            accounts: accountOptions,
            accountBookStartDate,
          }),
        ]),
      ),
    [accountBookStartDate, accountOptions, drafts],
  );
  const readyCount = useMemo(
    () =>
      getStatementImportReadyCount({
        drafts,
        statuses,
      }),
    [drafts, statuses],
  );
  const ignoredCount = useMemo(
    () => getStatementImportIgnoredCount(drafts),
    [drafts],
  );
  const reviewRows = useMemo(
    () =>
      getStatementImportGridRows({
        account,
        persistedBalance,
        drafts,
      }),
    [account, drafts, persistedBalance],
  );

  return {
    counterAccountOptions,
    ignoredCount,
    importDisabled: isStatementImportDisabled({
      drafts,
      readyCount,
      isSubmitting,
      isEditSubmitting,
    }),
    includedCount: drafts.length - ignoredCount,
    readyCount,
    reviewRows,
    statuses,
    summaryText: getStatementImportSummaryText({
      drafts,
      readyCount,
      ignoredCount,
    }),
  };
}
