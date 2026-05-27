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
  bulkIgnoredActionLabel,
  bulkShouldIgnoreSelectedDrafts,
  file,
  isEditSubmitting,
  isSubmitting,
  selectedDraftCount,
  summaryText,
  onBulkIgnoredChange,
  onFileChange,
}: {
  bulkIgnoredActionLabel: string;
  bulkShouldIgnoreSelectedDrafts: boolean;
  file: File | null;
  isEditSubmitting: boolean;
  isSubmitting: boolean;
  selectedDraftCount: number;
  summaryText: string;
  onBulkIgnoredChange: () => void;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <Stack gap={4}>
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

      <Group h={32} justify="end" align="center" gap="xs" wrap="nowrap">
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
    </Stack>
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
