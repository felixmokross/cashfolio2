import { useEffect, useState } from "react";
import { Form, useFetcher } from "react-router";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "~/platform/alert";
import { Button } from "~/platform/button";
import { action } from "~/transactions/actions/delete";

export function useDeleteTransaction() {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string>();

  function onDeleteTransaction(transactionId: string) {
    setTransactionId(transactionId);
    setIsOpen(true);
  }
  return {
    deleteTransactionProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      transactionId,
    },
    onDeleteTransaction,
  };
}

export function DeleteTransaction({
  isOpen,
  onClose,
  transactionId,
}: {
  isOpen: boolean;
  onClose: () => void;
  transactionId?: string;
}) {
  const [submitCount, setSubmitCount] = useState(0);
  const fetcher = useFetcher<typeof action>({
    key: `${transactionId ?? "new"}-${submitCount}`,
  });

  // TODO make this reusable
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      onDialogClose();
    }
  }, [fetcher.state, fetcher.data?.success, onClose]);

  function onDialogClose() {
    onClose();
    // delay a bit for the dialog close animation
    setTimeout(() => setSubmitCount((v) => v + 1), 500);
  }

  return (
    <Alert open={isOpen} onClose={onDialogClose} size="sm">
      <fetcher.Form
        className="contents"
        action="/transactions/delete"
        method="POST"
      >
        <input type="hidden" name="transactionId" value={transactionId} />
        <AlertTitle>
          Are you sure you want to delete this transaction?
        </AlertTitle>
        <AlertDescription>
          This will delete the transaction and all its associated bookings.
        </AlertDescription>
        <AlertActions>
          <Button hierarchy="tertiary" onClick={() => onDialogClose()}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive">
            Delete
          </Button>
        </AlertActions>
      </fetcher.Form>
    </Alert>
  );
}
