import type { CellValueChangedEvent } from "ag-grid-enterprise";
import {
  Alert,
  Button,
  FileInput,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconFileImport, IconUpload } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";
import { DataGrid } from "@/components/data-grid";
import {
  EditTransactionModal,
  type AccountOption,
} from "@/components/edit-transaction-modal";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { PageShell } from "@/components/page-shell";
import { TopPageHeader } from "@/components/top-page-header";
import type { AccountBookUnitUsage } from "@/shared/account-book-unit-usage";
import type { TransactionMutationValues } from "./-page-view";
import {
  getStatementImportDraftStatus,
  hasStatementImportSingleCounterBooking,
  parseStatementImportCsv,
  toStatementImportEditInitialValues,
  updateStatementImportDraftCounterAccount,
  updateStatementImportDraftDescription,
  updateStatementImportDraftTransaction,
  type StatementImportDraft,
} from "./-statement-import";
import type { LedgerAccount } from "./-page-types";
import { useStatementImportColumnDefs } from "./-statement-import-page-columns";
import {
  getStatementImportIgnoredCount,
  getStatementImportReadyCount,
  getStatementImportSummaryText,
  getStatementImportTransactionsToSubmit,
  isStatementImportDisabled,
  toggleStatementImportDraftIgnored,
} from "./-statement-import-page-controller";

type StatementImportPageViewProps = {
  accountBookId: string;
  account: LedgerAccount;
  accountBookStartDate: Date;
  accountOptions: AccountOption[];
  unitUsage: AccountBookUnitUsage;
  isSubmitting: boolean;
  period?: string;
  onSubmittingChange: (isSubmitting: boolean) => void;
  onSubmit: (transactions: TransactionMutationValues[]) => Promise<void>;
};

export function AccountStatementImportPageView({
  accountBookId,
  account,
  accountBookStartDate,
  accountOptions,
  unitUsage,
  isSubmitting,
  period,
  onSubmittingChange,
  onSubmit,
}: StatementImportPageViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<StatementImportDraft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>();
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
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
    setEditingDraftId(undefined);
    if (!nextFile) return;

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

  return (
    <PageShell>
      <TopPageHeader
        heading={
          <PageBreadcrumbs
            items={[
              {
                label: account.name,
                to: "/$accountBookId/$accountId",
                params: { accountBookId, accountId: account.id },
                search: { period },
                disabled: isSubmitting || isEditSubmitting,
              },
              { label: "Import Statement" },
            ]}
          />
        }
      />

      <Stack gap="md" flex={1} mih={0}>
        <Group align="end">
          <FileInput
            label="CSV File"
            placeholder="Select CSV file"
            accept=".csv,text/csv"
            value={file}
            leftSection={<IconUpload size={16} />}
            disabled={isSubmitting}
            clearable
            style={{ flex: "1 1 24rem" }}
            onChange={(nextFile) => void handleFileChange(nextFile)}
          />
          <Text c="dimmed" size="sm">
            {summaryText}
          </Text>
        </Group>

        {parseErrors.length > 0 ? (
          <Alert color="red" title="CSV could not be imported">
            <Stack gap={4}>
              {parseErrors.map((error) => (
                <Text key={error} size="sm">
                  {error}
                </Text>
              ))}
            </Stack>
          </Alert>
        ) : null}

        <DataGrid
          containerStyle={{ flex: 1, minHeight: 0 }}
          rowData={drafts}
          columnDefs={columnDefs}
          getRowId={({ data }) => data.id}
          defaultColDef={{
            editable: false,
            sortable: false,
            suppressHeaderMenuButton: true,
          }}
          rowClassRules={{
            "statement-import-row-ignored": ({ data }) => !!data?.ignored,
          }}
          onCellValueChanged={handleDraftCellChange}
        />

        <Group justify="end">
          <Tooltip
            label={
              importDisabled && drafts.length > 0
                ? includedCount === 0
                  ? "At least one non-ignored imported transaction is required."
                  : "All non-ignored imported transactions must be ready."
                : "Create transactions"
            }
            disabled={!importDisabled || drafts.length === 0}
          >
            <span>
              <Button
                leftSection={<IconFileImport size={16} />}
                loading={isSubmitting}
                disabled={importDisabled}
                onClick={() => void handleImport()}
              >
                Import Transactions
              </Button>
            </span>
          </Tooltip>
        </Group>
      </Stack>

      <Modal
        opened={!!editingDraft}
        onClose={() => {
          if (isEditSubmitting) return;
          setEditingDraftId(undefined);
        }}
        title="Edit Imported Transaction"
        size="100%"
        closeOnEscape={!isEditSubmitting}
        closeOnClickOutside={!isEditSubmitting}
        withCloseButton={!isEditSubmitting}
      >
        {editingDraft ? (
          <EditTransactionModal
            initialValues={toStatementImportEditInitialValues(editingDraft)}
            submitLabel="Save Draft"
            accounts={accountOptions}
            currentAccountId={account.id}
            accountBookStartDate={accountBookStartDate}
            unitUsage={unitUsage}
            preserveBookingUnitOnUnitlessEquityAccountChange
            onClose={() => {
              if (isEditSubmitting) return;
              setEditingDraftId(undefined);
            }}
            onSubmittingChange={setIsEditSubmitting}
            onSubmit={handleSaveDraft}
          />
        ) : null}
      </Modal>
    </PageShell>
  );
}
