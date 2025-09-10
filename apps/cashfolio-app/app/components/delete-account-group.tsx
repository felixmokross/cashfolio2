import { useState } from "react";
import { Form } from "react-router";
import { Alert, AlertActions, AlertTitle } from "~/platform/alert";
import { Button } from "~/platform/button";

export function useDeleteAccountGroup() {
  const [isOpen, setAlertOpen] = useState(false);
  const [accountGroupId, setAccountGroupId] = useState<string>();

  function onDeleteAccountGroup(transactionId: string) {
    setAccountGroupId(transactionId);
    setAlertOpen(true);
  }
  return {
    deleteAccountGroupProps: {
      isOpen,
      onClose: () => setAlertOpen(false),
      accountGroupId,
    },
    onDeleteAccountGroup,
  };
}

export function DeleteAccountGroup({
  isOpen,
  onClose,
  accountGroupId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountGroupId?: string;
}) {
  return (
    <Alert open={isOpen} onClose={onClose} size="md">
      <Form
        className="contents"
        action="/account-groups"
        method="DELETE"
        onSubmit={() => onClose()}
      >
        <input type="hidden" name="accountGroupId" value={accountGroupId} />
        <AlertTitle>
          Are you sure you want to delete this account group?
        </AlertTitle>
        <AlertActions>
          <Button hierarchy="tertiary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive">
            Delete
          </Button>
        </AlertActions>
      </Form>
    </Alert>
  );
}
