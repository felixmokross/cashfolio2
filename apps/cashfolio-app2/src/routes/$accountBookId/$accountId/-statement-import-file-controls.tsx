import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconEye, IconEyeOff, IconUpload } from "@tabler/icons-react";

export function StatementImportFileControls({
  file,
  isSubmitting,
  summaryText,
  onFileChange,
}: {
  file: File | null;
  isSubmitting: boolean;
  summaryText: string;
  onFileChange: (file: File | null) => void;
}) {
  return (
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
        onChange={onFileChange}
      />
      <Text c="dimmed" size="sm" style={{ marginLeft: "auto" }}>
        {summaryText}
      </Text>
    </Group>
  );
}

export function StatementImportBulkSelectionBar({
  bulkIgnoredActionLabel,
  bulkShouldIgnoreSelectedDrafts,
  isEditSubmitting,
  isSubmitting,
  selectedDraftCount,
  onBulkIgnoredChange,
}: {
  bulkIgnoredActionLabel: string;
  bulkShouldIgnoreSelectedDrafts: boolean;
  isEditSubmitting: boolean;
  isSubmitting: boolean;
  selectedDraftCount: number;
  onBulkIgnoredChange: () => void;
}) {
  return (
    <Group
      h={40}
      px="sm"
      justify="space-between"
      align="center"
      gap="xs"
      wrap="nowrap"
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderBottom: 0,
        borderTopLeftRadius: "var(--mantine-radius-sm)",
        borderTopRightRadius: "var(--mantine-radius-sm)",
        background: "var(--mantine-color-body)",
      }}
    >
      <Text c="dimmed" fw={500} size="xs">
        Bulk actions
      </Text>

      <Group justify="end" gap="xs" wrap="nowrap">
        {selectedDraftCount >= 2 ? (
          <>
            <Badge color="gray" variant="light">
              {selectedDraftCount} selected
            </Badge>
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={
                bulkShouldIgnoreSelectedDrafts ? (
                  <IconEyeOff size={16} />
                ) : (
                  <IconEye size={16} />
                )
              }
              disabled={isSubmitting || isEditSubmitting}
              onClick={onBulkIgnoredChange}
            >
              {bulkIgnoredActionLabel}
            </Button>
          </>
        ) : null}
      </Group>
    </Group>
  );
}

export function StatementImportParseErrors({
  parseErrors,
}: {
  parseErrors: string[];
}) {
  if (parseErrors.length === 0) {
    return null;
  }

  return (
    <Alert color="red" title="CSV could not be imported">
      <Stack gap={4}>
        {parseErrors.map((error) => (
          <Text key={error} size="sm">
            {error}
          </Text>
        ))}
      </Stack>
    </Alert>
  );
}
