import { useState } from "react";
import { Form } from "react-router";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "~/platform/alert";
import { Button } from "~/platform/button";

export function useDeleteTransaction({
  returnToAccountId,
}: {
  returnToAccountId: string;
}) {
  const [isOpen, setAlertOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string>();

  function onDeleteTransaction(transactionId: string) {
    setTransactionId(transactionId);
    setAlertOpen(true);
  }
  return {
    deleteTransactionProps: {
      key: transactionId, // TODO key seems to cause problems with animation, think of different way (e.g. reset form)
      isOpen,
      onClose: () => setAlertOpen(false),
      transactionId,
      returnToAccountId,
    },
    onDeleteTransaction,
  };
}

export function DeleteTransaction({
  isOpen,
  onClose,
  transactionId,
  returnToAccountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  returnToAccountId: string;
  transactionId?: string;
}) {
  return (
    <Alert open={isOpen} onClose={onClose} size="sm">
      <Form
        className="contents"
        action="/transactions"
        method="DELETE"
        onSubmit={() => onClose()}
      >
        <input
          type="hidden"
          name="returnToAccountId"
          value={returnToAccountId}
        />
        <input type="hidden" name="transactionId" value={transactionId} />
        <AlertTitle>
          Are you sure you want to delete this transaction?
        </AlertTitle>
        <AlertDescription>
          This will delete the transaction and all its associated bookings.
        </AlertDescription>
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
