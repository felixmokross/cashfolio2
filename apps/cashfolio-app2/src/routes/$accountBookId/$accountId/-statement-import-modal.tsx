import type { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconFileImport,
  IconPencil,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { DataGrid } from "@/components/data-grid";
import {
  EditTransactionModal,
  type AccountOption,
} from "@/components/edit-transaction-modal";
import {
  DATE_COLUMN,
  FORMATTED_NUMERIC_COLUMN,
} from "@/components/column-types";
import type { AccountBookUnitUsage } from "@/shared/account-book-unit-usage";
import type { TransactionMutationValues } from "./-page-view";
import {
  getStatementImportDraftStatus,
  parseStatementImportCsv,
  toStatementImportEditInitialValues,
  updateStatementImportDraftTransaction,
  type StatementImportDraft,
} from "./-statement-import";
import type { LedgerAccount } from "./-page-types";

type StatementImportModalProps = {
  opened: boolean;
  account: LedgerAccount;
  accountBookStartDate: Date;
  accountOptions: AccountOption[];
  unitUsage: AccountBookUnitUsage;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmittingChange: (isSubmitting: boolean) => void;
  onSubmit: (transactions: TransactionMutationValues[]) => Promise<void>;
};

export function AccountStatementImportModal({
  opened,
  account,
  accountBookStartDate,
  accountOptions,
  unitUsage,
  isSubmitting,
  onClose,
  onSubmittingChange,
  onSubmit,
}: StatementImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<StatementImportDraft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>();
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  useEffect(() => {
    if (opened) return;
    setFile(null);
    setParseErrors([]);
    setDrafts([]);
    setEditingDraftId(undefined);
    setIsEditSubmitting(false);
  }, [opened]);

  const statuses = useMemo(
    () =>
      new Map(
        drafts.map((draft) => [
          draft.id,
          getStatementImportDraftStatus({ draft, accounts: accountOptions }),
        ]),
      ),
    [accountOptions, drafts],
  );
  const readyCount = useMemo(
    () =>
      drafts.filter((draft) => statuses.get(draft.id)?.kind === "ready").length,
    [drafts, statuses],
  );
  const editingDraft = drafts.find((draft) => draft.id === editingDraftId);
  const importDisabled =
    isSubmitting ||
    isEditSubmitting ||
    drafts.length === 0 ||
    readyCount !== drafts.length;

  const columnDefs = useMemo<ColDef<StatementImportDraft>[]>(
    () => [
      {
        colId: "status",
        headerName: "Status",
        width: 135,
        cellRenderer: ({ data }: ICellRendererParams<StatementImportDraft>) => {
          if (!data) return null;
          const status = statuses.get(data.id);
          if (!status) return null;
          return (
            <Tooltip label={status.message ?? status.label}>
              <Badge color={status.color} variant="light">
                {status.label}
              </Badge>
            </Tooltip>
          );
        },
      },
      {
        field: "date",
        headerName: "Date",
        width: 130,
        type: DATE_COLUMN,
        cellDataType: "dateString",
      },
      {
        field: "amount",
        headerName: "Amount",
        width: 130,
        type: FORMATTED_NUMERIC_COLUMN,
      },
      {
        field: "originalAmount",
        headerName: "Original Amount",
        width: 160,
        type: FORMATTED_NUMERIC_COLUMN,
      },
      {
        field: "originalCurrency",
        headerName: "Original Ccy.",
        width: 135,
      },
      {
        field: "exchangeRate",
        headerName: "Exchange Rate",
        width: 145,
        type: FORMATTED_NUMERIC_COLUMN,
        context: {
          formattedNumeric: {
            getDisplayDecimals: () => 6,
          },
        },
      },
      {
        field: "description",
        headerName: "Description",
        minWidth: 240,
        flex: 1,
      },
      {
        colId: "counterAccount",
        headerName: "Counter Account",
        width: 220,
        valueGetter: ({ data }) => {
          if (!data) return "";
          const counterBooking = data.transaction.bookings.find(
            (booking) => booking.accountId !== account.id,
          );
          if (!counterBooking?.accountId) return "Required";
          return (
            accountOptions.find(
              (option) => option.value === counterBooking.accountId,
            )?.label ?? "Unavailable"
          );
        },
      },
      {
        colId: "actions",
        headerName: "",
        width: 95,
        sortable: false,
        filter: false,
        resizable: false,
        suppressHeaderMenuButton: true,
        cellClass: "actions-cell",
        cellRenderer: ({ data }: ICellRendererParams<StatementImportDraft>) => {
          if (!data) return null;
          return (
            <Group gap={4} wrap="nowrap" h="100%" align="center">
              <Tooltip label="Edit">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setEditingDraftId(data.id)}
                  aria-label="Edit Imported Transaction"
                >
                  <IconPencil size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Remove">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() =>
                    setDrafts((current) =>
                      current.filter((draft) => draft.id !== data.id),
                    )
                  }
                  aria-label="Remove Imported Transaction"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        },
      },
    ],
    [account.id, accountOptions, isSubmitting, statuses],
  );

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setParseErrors([]);
    setDrafts([]);
    setEditingDraftId(undefined);
    if (!nextFile) return;

    const result = parseStatementImportCsv({
      text: await nextFile.text(),
      currentAccount: account,
    });
    setParseErrors(result.errors);
    setDrafts(result.drafts);
  }

  async function handleImport() {
    onSubmittingChange(true);
    try {
      await onSubmit(drafts.map((draft) => draft.transaction));
    } finally {
      onSubmittingChange(false);
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
    <>
      <Modal
        opened={opened}
        onClose={() => {
          if (isSubmitting || isEditSubmitting) return;
          onClose();
        }}
        title="Import Statement"
        size="100%"
        closeOnEscape={!isSubmitting && !isEditSubmitting}
        closeOnClickOutside={!isSubmitting && !isEditSubmitting}
        withCloseButton={!isSubmitting && !isEditSubmitting}
      >
        <Stack gap="md">
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
              {drafts.length > 0
                ? `${readyCount} of ${drafts.length} ready`
                : "No statement loaded"}
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
            containerStyle={{ height: "calc(100vh - 25rem)" }}
            rowData={drafts}
            columnDefs={columnDefs}
            getRowId={({ data }) => data.id}
            defaultColDef={{
              sortable: false,
              suppressHeaderMenuButton: true,
            }}
          />

          <Group justify="end">
            <Button
              variant="subtle"
              disabled={isSubmitting || isEditSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Tooltip
              label={
                importDisabled && drafts.length > 0
                  ? "All imported transactions must be ready."
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
      </Modal>

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
    </>
  );
}
