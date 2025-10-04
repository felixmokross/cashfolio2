import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useFetcher } from "react-router";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { ErrorMessage } from "./fieldset";
import type { Alert } from "../alert";

export type FetcherData =
  | { success: true; errors: never }
  | { success: false; errors: { form?: string } & Record<string, string> };
export type FormKey = "new" | `edit-${string}`;

export type FormDialogContextType = {
  entityId?: string;
  fetcher: ReturnType<typeof useFetcher<FetcherData>>;
  onDialogClose: () => void;
};

const FormDialogContext = createContext<FormDialogContextType | null>(null);

export function FormDialog({
  children,
  entityId,
  onClose,
  action,
  dialogComponent: DialogComponent = Dialog,
  ...props
}: Omit<
  ComponentProps<typeof Alert & typeof Dialog>,
  "onClose" | "children"
> & {
  entityId?: string;
  onClose: () => void;
  action?: string;
  children?: ReactNode | ((context: FormDialogContextType) => ReactNode);
  dialogComponent?: typeof Alert & typeof Dialog;
}) {
  const [submitCount, setSubmitCount] = useState(0);
  const fetcher = useFetcher<FetcherData>({
    key: `${entityId ?? "new"}-${submitCount}`,
  });

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      onDialogClose();
    }
  }, [fetcher.state, fetcher.data?.success, onDialogClose]);

  function onDialogClose() {
    onClose();
    // delay a bit for the dialog close animation
    setTimeout(() => setSubmitCount((v) => v + 1), 500);
  }

  const contextValue: FormDialogContextType = {
    onDialogClose,
    fetcher,
    entityId,
  };
  return (
    <DialogComponent {...props} onClose={onDialogClose}>
      <fetcher.Form className="contents" action={action} method="POST">
        <FormDialogContext.Provider value={contextValue}>
          {typeof children === "function" ? children(contextValue) : children}
        </FormDialogContext.Provider>
      </fetcher.Form>
    </DialogComponent>
  );
}

export function CancelButton() {
  const { onDialogClose } = useFormDialogContext();
  return (
    <Button hierarchy="tertiary" onClick={() => onDialogClose()}>
      Cancel
    </Button>
  );
}

export function CreateOrSaveButton() {
  const { entityId, fetcher } = useFormDialogContext();
  return (
    <Button
      type="submit"
      disabled={fetcher.state !== "idle" || fetcher.data?.success}
    >
      {entityId
        ? fetcher.state === "idle"
          ? "Save"
          : "Saving…"
        : fetcher.state === "idle"
          ? "Create"
          : "Creating…"}
    </Button>
  );
}

export function DeleteButton() {
  const { fetcher } = useFormDialogContext();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={fetcher.state !== "idle" || fetcher.data?.success}
    >
      {fetcher.state === "idle" ? "Delete" : "Deleting…"}
    </Button>
  );
}

export function FormErrorMessage() {
  const { fetcher } = useFormDialogContext();
  if (!fetcher.data?.errors?.form) return null;
  return <ErrorMessage>{fetcher.data.errors.form}</ErrorMessage>;
}

function useFormDialogContext() {
  const context = useContext(FormDialogContext);
  if (!context) {
    throw new Error("useFormDialogContext must be used within a FormDialog");
  }
  return context;
}
