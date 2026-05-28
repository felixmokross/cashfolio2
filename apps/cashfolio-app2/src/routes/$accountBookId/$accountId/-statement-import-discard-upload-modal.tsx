import { Button, Group, Modal, Text } from "@mantine/core";

export function StatementImportDiscardUploadModal({
  opened,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Discard reviewed statement?"
    >
      <Text mb="lg">
        Going back to Upload will clear the current statement review. Unsaved
        changes will be lost.
      </Text>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>
          Keep reviewing
        </Button>
        <Button color="red" onClick={onConfirm}>
          Discard and upload another file
        </Button>
      </Group>
    </Modal>
  );
}
