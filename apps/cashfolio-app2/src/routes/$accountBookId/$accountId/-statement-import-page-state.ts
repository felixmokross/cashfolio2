import type {
  CellValueChangedEvent,
  SelectionChangedEvent,
} from "ag-grid-enterprise";
import { useMemo, useRef, useState } from "react";
import type { AccountOption } from "@/components/edit-transaction-modal";
import type { TransactionMutationValues } from "./-page-view";
import type { LedgerAccount } from "./-page-types";
import {
  getStatementImportDraftStatus,
  hasStatementImportSingleCounterBooking,
  parseStatementImportCsv,
  updateStatementImportDraftCounterAccount,
  updateStatementImportDraftDescription,
  updateStatementImportDraftTransaction,
  type StatementImportDraft,
} from "./-statement-import";
import { useStatementImportColumnDefs } from "./-statement-import-page-columns";
import {
  getStatementImportBulkIgnoredActionLabel,
  getStatementImportIgnoredCount,
  getStatementImportReadyCount,
  getStatementImportSummaryText,
  getStatementImportTransactionsToSubmit,
  isStatementImportDisabled,
  setStatementImportDraftsIgnored,
  toggleStatementImportDraftIgnored,
} from "./-statement-import-page-controller";

export function useStatementImportPageState(args: {
  account: LedgerAccount;
  accountBookStartDate: Date;
  accountOptions: AccountOption[];
  isSubmitting: boolean;
  onSubmittingChange: (isSubmitting: boolean) => void;
  onSubmit: (transactions: TransactionMutationValues[]) => Promise<void>;
}) {
  const {
    account,
    accountBookStartDate,
    accountOptions,
    isSubmitting,
    onSubmittingChange,
    onSubmit,
  } = args;
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<StatementImportDraft[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>();
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<"upload" | "review">("upload");
  const fileReadRequestId = useRef(0);

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
  const summaryText = getStatementImportSummaryText({
    drafts,
    readyCount,
    ignoredCount,
  });
  const includedCount = drafts.length - ignoredCount;
  const editingDraft = drafts.find((draft) => draft.id === editingDraftId);
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
  const canReviewStatementImport =
    drafts.length > 0 && parseErrors.length === 0;
  const importDisabled = isStatementImportDisabled({
    drafts,
    readyCount,
    isSubmitting,
    isEditSubmitting,
  });

  const columnDefs = useStatementImportColumnDefs({
    counterAccountOptions,
    isSubmitting,
    statuses,
    onEditDraft: setEditingDraftId,
    onToggleDraftIgnored: (draftId) =>
      setDrafts((current) =>
        toggleStatementImportDraftIgnored(current, draftId),
      ),
  });

  async function handleFileChange(nextFile: File | null) {
    const requestId = fileReadRequestId.current + 1;
    fileReadRequestId.current = requestId;
    setFile(nextFile);
    setParseErrors([]);
    setDrafts([]);
    setSelectedDraftIds([]);
    setEditingDraftId(undefined);
    setActiveStep("upload");
    if (!nextFile) {
      return;
    }

    const text = await nextFile.text();
    if (requestId !== fileReadRequestId.current) {
      return;
    }

    const result = parseStatementImportCsv({
      text,
      currentAccount: account,
    });
    if (requestId !== fileReadRequestId.current) {
      return;
    }

    setParseErrors(result.errors);
    setDrafts(result.drafts);
    if (result.errors.length === 0 && result.drafts.length > 0) {
      setActiveStep("review");
    }
  }

  async function handleImport() {
    onSubmittingChange(true);
    try {
      await onSubmit(getStatementImportTransactionsToSubmit(drafts));
    } finally {
      onSubmittingChange(false);
    }
  }

  function handleDraftCellChange(
    event: CellValueChangedEvent<StatementImportDraft>,
  ) {
    if (!event.data) {
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

      const selectedAccount = counterAccountOptions.find(
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
    event: SelectionChangedEvent<StatementImportDraft>,
  ) {
    setSelectedDraftIds(event.api.getSelectedRows().map((draft) => draft.id));
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

  function handleSaveDraft(values: TransactionMutationValues) {
    if (!editingDraft) return Promise.resolve();
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === editingDraft.id
          ? updateStatementImportDraftTransaction({
              draft,
              transaction: values,
            })
          : draft,
      ),
    );
    setEditingDraftId(undefined);
    return Promise.resolve();
  }

  function closeEditDraft() {
    if (isEditSubmitting) return;
    setEditingDraftId(undefined);
  }

  return {
    activeStep,
    bulkIgnoredActionLabel,
    bulkShouldIgnoreSelectedDrafts,
    canReviewStatementImport,
    columnDefs,
    drafts,
    editingDraft,
    file,
    handleDraftCellChange,
    handleFileChange,
    handleBulkIgnoredChange,
    handleImport,
    handleSaveDraft,
    handleSelectionChange,
    ignoredCount,
    importDisabled,
    includedCount,
    isEditSubmitting,
    parseErrors,
    readyCount,
    selectedDraftCount,
    setActiveStep,
    setIsEditSubmitting,
    closeEditDraft,
    summaryText,
  };
}
