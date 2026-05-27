import { Alert, FileInput, Group, Stack, Text } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";

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
      <Text c="dimmed" size="sm">
        {summaryText}
      </Text>
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
