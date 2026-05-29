import type {
  CellValueChangedEvent,
  SelectionChangedEvent,
} from "ag-grid-enterprise";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { AccountOption } from "@/components/edit-transaction-modal";
import type { LedgerAccount } from "./-page-types";
import {
  hasStatementImportSingleCounterBooking,
  updateStatementImportDraftCounterAccount,
  updateStatementImportDraftDescription,
  type StatementImportDraft,
} from "./-statement-import";
import { useStatementImportColumnDefs } from "./-statement-import-page-columns";
import {
  getStatementImportBulkIgnoredActionLabel,
  isStatementImportReviewDraftRow,
  setStatementImportDraftsIgnored,
  type StatementImportGridRow,
  toggleStatementImportDraftIgnored,
} from "./-statement-import-page-controller";
import { useStatementImportReviewDerivedState } from "./-statement-import-page-review-derived-state";

export function useStatementImportReviewState(args: {
  account: LedgerAccount;
  accountBookStartDate: Date;
  accountOptions: AccountOption[];
  persistedBalance: number;
  drafts: StatementImportDraft[];
  setDrafts: Dispatch<SetStateAction<StatementImportDraft[]>>;
  isSubmitting: boolean;
  isEditSubmitting: boolean;
  onEditDraft: (draftId: string) => void;
}) {
  const {
    account,
    accountBookStartDate,
    accountOptions,
    persistedBalance,
    drafts,
    setDrafts,
    isSubmitting,
    isEditSubmitting,
    onEditDraft,
  } = args;
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);

  const derivedState = useStatementImportReviewDerivedState({
    account,
    accountBookStartDate,
    accountOptions,
    persistedBalance,
    drafts,
    isSubmitting,
    isEditSubmitting,
  });
  const selectedDraftIdSet = useMemo(
    () => new Set(selectedDraftIds),
    [selectedDraftIds],
  );
  const selectedDrafts = useMemo(
    () => drafts.filter((draft) => selectedDraftIdSet.has(draft.id)),
    [drafts, selectedDraftIdSet],
  );
  const selectedDraftCount = selectedDrafts.length;
  const bulkShouldIgnoreSelectedDrafts = selectedDrafts.some(
    (draft) => !draft.ignored,
  );
  const bulkIgnoredActionLabel = getStatementImportBulkIgnoredActionLabel({
    shouldIgnore: bulkShouldIgnoreSelectedDrafts,
    selectedDraftCount,
  });

  const columnDefs = useStatementImportColumnDefs({
    account,
    counterAccountOptions: derivedState.counterAccountOptions,
    isSubmitting,
    statuses: derivedState.statuses,
    onEditDraft,
    onToggleDraftIgnored: (draftId) =>
      setDrafts((current) =>
        toggleStatementImportDraftIgnored(current, draftId),
      ),
  });

  function clearSelection() {
    setSelectedDraftIds([]);
  }

  function handleDraftCellChange(
    event: CellValueChangedEvent<StatementImportGridRow>,
  ) {
    if (!isStatementImportReviewDraftRow(event.data)) {
      return;
    }
    if (event.data.ignored) {
      return;
    }

    if (event.colDef.field === "description") {
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === event.data?.id
            ? updateStatementImportDraftDescription({
                draft,
                description: String(event.newValue ?? ""),
              })
            : draft,
        ),
      );
      return;
    }

    if (event.colDef.field === "counterAccountId") {
      if (!hasStatementImportSingleCounterBooking(event.data)) {
        return;
      }

      const selectedAccount = derivedState.counterAccountOptions.find(
        (option) => option.value === event.newValue,
      );
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === event.data?.id
            ? updateStatementImportDraftCounterAccount({
                draft,
                selectedAccount,
              })
            : draft,
        ),
      );
    }
  }

  function handleSelectionChange(
    event: SelectionChangedEvent<StatementImportGridRow>,
  ) {
    setSelectedDraftIds(
      event.api
        .getSelectedRows()
        .filter(isStatementImportReviewDraftRow)
        .map((draft) => draft.id),
    );
  }

  function handleBulkIgnoredChange() {
    if (selectedDraftCount < 1) {
      return;
    }

    setDrafts((current) =>
      setStatementImportDraftsIgnored({
        drafts: current,
        draftIds: selectedDraftIds,
        ignored: bulkShouldIgnoreSelectedDrafts,
      }),
    );
  }

  return {
    bulkIgnoredActionLabel,
    bulkShouldIgnoreSelectedDrafts,
    clearSelection,
    columnDefs,
    handleBulkIgnoredChange,
    handleDraftCellChange,
    handleSelectionChange,
    ignoredCount: derivedState.ignoredCount,
    importDisabled: derivedState.importDisabled,
    includedCount: derivedState.includedCount,
    readyCount: derivedState.readyCount,
    reviewRows: derivedState.reviewRows,
    selectedDraftCount,
    summaryText: derivedState.summaryText,
  };
}
