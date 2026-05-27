import { Stack } from "@mantine/core";
import { DataGrid } from "@/components/data-grid";
import type { AccountOption } from "@/components/edit-transaction-modal";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { PageShell } from "@/components/page-shell";
import { TopPageHeader } from "@/components/top-page-header";
import type { AccountBookUnitUsage } from "@/shared/account-book-unit-usage";
import type { TransactionMutationValues } from "./-page-view";
import type { LedgerAccount } from "./-page-types";
import { StatementImportActions } from "./-statement-import-actions";
import { StatementImportEditModal } from "./-statement-import-edit-modal";
import {
  StatementImportFileControls,
  StatementImportParseErrors,
} from "./-statement-import-file-controls";
import { useStatementImportPageState } from "./-statement-import-page-state";

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
  const state = useStatementImportPageState({
    account,
    accountBookStartDate,
    accountOptions,
    isSubmitting,
    onSubmittingChange,
    onSubmit,
  });

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
                disabled: isSubmitting || state.isEditSubmitting,
              },
              { label: "Import Statement" },
            ]}
          />
        }
      />

      <Stack gap="md" flex={1} mih={0}>
        <StatementImportFileControls
          bulkIgnoredActionLabel={state.bulkIgnoredActionLabel}
          bulkShouldIgnoreSelectedDrafts={state.bulkShouldIgnoreSelectedDrafts}
          file={state.file}
          isEditSubmitting={state.isEditSubmitting}
          isSubmitting={isSubmitting}
          selectedDraftCount={state.selectedDraftCount}
          summaryText={state.summaryText}
          onBulkIgnoredChange={state.handleBulkIgnoredChange}
          onFileChange={(nextFile) => void state.handleFileChange(nextFile)}
        />

        <StatementImportParseErrors parseErrors={state.parseErrors} />

        <DataGrid
          containerStyle={{ flex: 1, minHeight: 0 }}
          rowData={state.drafts}
          columnDefs={state.columnDefs}
          getRowId={({ data }) => data.id}
          defaultColDef={{
            editable: false,
            sortable: false,
            suppressHeaderMenuButton: true,
          }}
          rowClassRules={{
            "statement-import-row-ignored": ({ data }) => !!data?.ignored,
          }}
          rowSelection={{
            mode: "multiRow",
            checkboxes: true,
            headerCheckbox: true,
            enableClickSelection: false,
          }}
          onCellValueChanged={state.handleDraftCellChange}
          onSelectionChanged={state.handleSelectionChange}
        />

        <StatementImportActions
          draftsLength={state.drafts.length}
          includedCount={state.includedCount}
          importDisabled={state.importDisabled}
          isSubmitting={isSubmitting}
          onImport={() => void state.handleImport()}
        />
      </Stack>

      <StatementImportEditModal
        account={account}
        accountBookStartDate={accountBookStartDate}
        accountOptions={accountOptions}
        editingDraft={state.editingDraft}
        isEditSubmitting={state.isEditSubmitting}
        unitUsage={unitUsage}
        onClose={state.closeEditDraft}
        onSaveDraft={state.handleSaveDraft}
        onSubmittingChange={state.setIsEditSubmitting}
      />
    </PageShell>
  );
}
