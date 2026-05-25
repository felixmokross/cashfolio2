import type { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import { ActionIcon, Badge, Group, Tooltip } from "@mantine/core";
import { IconEye, IconEyeOff, IconPencil } from "@tabler/icons-react";
import { useMemo } from "react";
import {
  ACCOUNT_TREE_SELECT_COLUMN,
  DATE_COLUMN,
  FORMATTED_NUMERIC_COLUMN,
  TEXT_COLUMN,
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
  onToggleDraftIgnored: (draftId: string) => void;
}): ColDef<StatementImportDraft>[] {
  const {
    counterAccountOptions,
    isSubmitting,
    onEditDraft,
    onToggleDraftIgnored,
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
        editable: ({ data }) => !isSubmitting && data != null && !data.ignored,
        type: TEXT_COLUMN,
      },
      {
        field: "counterAccountId",
        headerName: "Counter Account",
        width: 260,
        editable: ({ data }) =>
          !isSubmitting &&
          data != null &&
          !data.ignored &&
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
        pinned: "right",
        sortable: false,
        filter: false,
        resizable: false,
        suppressHeaderMenuButton: true,
        cellClass: "actions-cell",
        cellRenderer: ({ data }: ICellRendererParams<StatementImportDraft>) => {
          if (!data) return null;
          const editDisabled = isSubmitting || data.ignored;
          const toggleIgnoredLabel = data.ignored
            ? "Unignore Imported Transaction"
            : "Ignore Imported Transaction";
          return (
            <Group gap={4} wrap="nowrap" h="100%" align="center">
              <Tooltip
                label={data.ignored ? "Ignored rows cannot be edited" : "Edit"}
              >
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  disabled={editDisabled}
                  onClick={() => onEditDraft(data.id)}
                  aria-label="Edit Imported Transaction"
                >
                  <IconPencil size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={toggleIgnoredLabel}>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => onToggleDraftIgnored(data.id)}
                  aria-label={toggleIgnoredLabel}
                >
                  {data.ignored ? (
                    <IconEye size={16} />
                  ) : (
                    <IconEyeOff size={16} />
                  )}
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        },
      },
    ],
    [
      counterAccountOptions,
      isSubmitting,
      onEditDraft,
      onToggleDraftIgnored,
      statuses,
    ],
  );
}
