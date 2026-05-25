import type { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import { ActionIcon, Badge, Group, Tooltip } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useMemo } from "react";
import {
  ACCOUNT_TREE_SELECT_COLUMN,
  DATE_COLUMN,
  FORMATTED_NUMERIC_COLUMN,
} from "@/components/column-types";
import type { AccountOption } from "@/components/edit-transaction-modal";
import type {
  StatementImportDraft,
  StatementImportDraftStatus,
} from "./-statement-import";
import { hasStatementImportSingleCounterBooking } from "./-statement-import";

export function useStatementImportColumnDefs(args: {
  counterAccountOptions: AccountOption[];
  isSubmitting: boolean;
  statuses: Map<string, StatementImportDraftStatus>;
  onEditDraft: (draftId: string) => void;
  onRemoveDraft: (draftId: string) => void;
}): ColDef<StatementImportDraft>[] {
  const {
    counterAccountOptions,
    isSubmitting,
    onEditDraft,
    onRemoveDraft,
    statuses,
  } = args;

  return useMemo(
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
        field: "description",
        headerName: "Description",
        minWidth: 240,
        flex: 1,
      },
      {
        field: "counterAccountId",
        headerName: "Counter Account",
        width: 260,
        editable: ({ data }) =>
          !isSubmitting &&
          data != null &&
          hasStatementImportSingleCounterBooking(data),
        cellRenderer: ({
          data,
          value,
        }: ICellRendererParams<StatementImportDraft>) => {
          if (!data) return null;
          if (!hasStatementImportSingleCounterBooking(data)) {
            return (
              <Badge color="gray" variant="light">
                Multiple
              </Badge>
            );
          }

          return (
            counterAccountOptions.find((option) => option.value === value)
              ?.label ?? ""
          );
        },
        type: ACCOUNT_TREE_SELECT_COLUMN,
        context: {
          options: counterAccountOptions,
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
                  onClick={() => onEditDraft(data.id)}
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
                  onClick={() => onRemoveDraft(data.id)}
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
    [counterAccountOptions, isSubmitting, onEditDraft, onRemoveDraft, statuses],
  );
}
