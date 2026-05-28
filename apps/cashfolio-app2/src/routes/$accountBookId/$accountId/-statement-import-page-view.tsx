import {
  Button,
  Center,
  Group,
  Modal,
  Stack,
  Stepper,
  Text,
} from "@mantine/core";
import { IconFileUpload, IconTable } from "@tabler/icons-react";
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
  StatementImportBulkSelectionBar,
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
  const activeStep = state.activeStep === "upload" ? 0 : 1;

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

      <Stepper
        active={activeStep}
        flex={1}
        mih={0}
        styles={{
          root: {
            display: "flex",
            flexDirection: "column",
          },
          content: {
            display: "flex",
            flex: 1,
            flexDirection: "column",
            minHeight: 0,
          },
          steps: {
            alignSelf: "center",
            maxWidth: 640,
            width: "100%",
          },
        }}
        onStepClick={state.handleStepClick}
      >
        <Stepper.Step
          label="Upload"
          icon={<IconFileUpload size={18} />}
          allowStepSelect={!isSubmitting && !state.isEditSubmitting}
        >
          <Center flex={1} mih={240}>
            <Stack align="center" gap="md" w="100%">
              <StatementImportFileControls
                file={state.file}
                isSubmitting={isSubmitting}
                onFileChange={(nextFile) =>
                  void state.handleFileChange(nextFile)
                }
              />

              <StatementImportParseErrors parseErrors={state.parseErrors} />
            </Stack>
          </Center>
        </Stepper.Step>

        <Stepper.Step
          label="Review"
          icon={<IconTable size={18} />}
          allowStepSelect={
            state.canReviewStatementImport &&
            !isSubmitting &&
            !state.isEditSubmitting
          }
        >
          <Stack gap="md" flex={1} mih={0}>
            <Stack gap={0} flex={1} mih={0}>
              <StatementImportBulkSelectionBar
                bulkIgnoredActionLabel={state.bulkIgnoredActionLabel}
                bulkShouldIgnoreSelectedDrafts={
                  state.bulkShouldIgnoreSelectedDrafts
                }
                isEditSubmitting={state.isEditSubmitting}
                isSubmitting={isSubmitting}
                selectedDraftCount={state.selectedDraftCount}
                summaryText={state.summaryText}
                onBulkIgnoredChange={state.handleBulkIgnoredChange}
              />

              <DataGrid
                containerStyle={{
                  flex: 1,
                  minHeight: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                }}
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
            </Stack>

            <StatementImportActions
              draftsLength={state.drafts.length}
              includedCount={state.includedCount}
              importDisabled={state.importDisabled}
              isSubmitting={isSubmitting}
              onImport={() => void state.handleImport()}
            />
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Modal
        opened={state.discardUploadModalOpened}
        onClose={state.closeDiscardUploadModal}
        title="Discard reviewed statement?"
      >
        <Text mb="lg">
          Going back to Upload will clear the current statement review. Unsaved
          changes will be lost.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={state.closeDiscardUploadModal}>
            Keep reviewing
          </Button>
          <Button color="red" onClick={state.resetStatementImportReview}>
            Discard and upload another file
          </Button>
        </Group>
      </Modal>

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
