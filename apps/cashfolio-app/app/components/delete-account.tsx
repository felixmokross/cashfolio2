import { useState } from "react";
import { Form } from "react-router";
import { Alert, AlertActions, AlertTitle } from "~/platform/alert";
import { Button } from "~/platform/button";

export function useDeleteAccount() {
  const [isOpen, setAlertOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>();

  function onDeleteAccount(accountId: string) {
    setAccountId(accountId);
    setAlertOpen(true);
  }
  return {
    deleteAccountProps: {
      isOpen,
      onClose: () => setAlertOpen(false),
      accountId,
    },
    onDeleteAccount,
  };
}

export function DeleteAccount({
  isOpen,
  onClose,
  accountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
}) {
  return (
    <Alert open={isOpen} onClose={onClose} size="sm">
      <Form
        className="contents"
        action="/accounts"
        method="DELETE"
        onSubmit={() => onClose()}
      >
        <input type="hidden" name="accountId" value={accountId} />
        <AlertTitle>Are you sure you want to delete this account?</AlertTitle>
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
