import { DialogActions, DialogBody, DialogTitle } from "~/platform/dialog";
import {
  ErrorMessage,
  Field,
  FieldGroup,
  Label,
} from "~/platform/forms/fieldset";
import { Input } from "~/platform/forms/input";
import type { AccountOption } from "~/types";
import { AccountCombobox } from "~/accounts/account-combobox";
import { DateInput } from "~/platform/forms/date-input";
import { FormattedNumberInput } from "~/platform/forms/formatted-number-input";
import { useState } from "react";
import type { Serialize } from "~/serialization";
import { CurrencyCombobox } from "../components/currency-combobox";
import type { TransactionWithBookings } from "~/transactions/types";
import {
  CancelButton,
  FormDialog,
  FormErrorMessage,
  CreateOrSaveButton,
  useFormDialogContext,
} from "~/platform/forms/form-dialog";
import { useAccountBook } from "~/account-books/hooks";
import { formatISODate } from "~/formatting";
import { today } from "~/dates";
import { Checkbox, CheckboxField } from "~/platform/forms/checkbox";
import { Switch } from "~/platform/forms/switch";
import * as Headless from "@headlessui/react";
import { SplitTransactionForm } from "./split-transaction-form";
import { UnitListbox } from "~/units/unit-listbox";
import { Unit } from "~/.prisma-client/enums";
import { CryptocurrencyCombobox } from "~/components/cryptocurrency-combobox";

export function useEditTransaction() {
  const [isOpen, setIsOpen] = useState(false);
  const [transaction, setTransaction] =
    useState<Serialize<TransactionWithBookings>>();

  return {
    editTransactionProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      transaction,
    },
    onNewTransaction: () => {
      setTransaction(undefined);
      setIsOpen(true);
    },
    onEditTransaction: (transaction: Serialize<TransactionWithBookings>) => {
      setTransaction(transaction);
      setIsOpen(true);
    },
  };
}

type InputMode = "simple" | "split";

export function EditTransaction({
  isOpen,
  onClose,
  accounts,
  transaction,
  lockedAccountId,
  defaultDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  transaction?: Serialize<TransactionWithBookings>;
  lockedAccountId: string;
  defaultDate?: string;
}) {
  const accountBook = useAccountBook();
  const [createAnother, setCreateAnother] = useState(false);
  const [mode, setMode] = useState<InputMode>(transaction ? "split" : "simple");
  return (
    <FormDialog
      size={mode === "simple" ? "2xl" : "3xl"}
      open={isOpen}
      onClose={(action) => {
        if (action === "cancel" || !createAnother) {
          onClose();
        }
      }}
      action={
        transaction
          ? `/${accountBook.id}/transactions/update`
          : `/${accountBook.id}/transactions/create`
      }
      entityId={transaction?.id}
    >
      <>
        <input type="hidden" name="transactionId" value={transaction?.id} />
        <div className="flex justify-between items-center">
          <DialogTitle>
            {transaction ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
          <Headless.Field className="flex items-center gap-4">
            <Switch
              checked={mode === "split"}
              onChange={(value) => setMode(value ? "split" : "simple")}
            />
            <Label>Split transaction</Label>
          </Headless.Field>
        </div>
        <DialogBody>
          <TransactionFormGroup
            accounts={accounts.filter(
              (a) =>
                a.isActive ||
                transaction?.bookings.map((b) => b.accountId).includes(a.id),
            )}
            transaction={transaction}
            lockedAccountId={lockedAccountId}
            defaultDate={defaultDate}
            mode={mode}
          />
        </DialogBody>
        <DialogActions>
          <CheckboxField className="mr-4">
            <Checkbox
              onChange={(value) => setCreateAnother(value)}
              checked={createAnother}
            />
            <Label>Create another</Label>
          </CheckboxField>
          <CancelButton />
          <CreateOrSaveButton />
        </DialogActions>
      </>
    </FormDialog>
  );
}

function TransactionFormGroup({
  accounts,
  transaction,
  lockedAccountId,
  defaultDate,
  mode,
}: {
  accounts: AccountOption[];
  transaction?: Serialize<TransactionWithBookings>;
  lockedAccountId: string;
  defaultDate?: string;
  mode: InputMode;
}) {
  const { fetcher } = useFormDialogContext();
  return (
    <FieldGroup>
      {mode === "simple" ? (
        <SimpleForm
          accounts={accounts}
          lockedAccountId={lockedAccountId}
          defaultDate={defaultDate}
        />
      ) : (
        <SplitTransactionForm
          transaction={transaction}
          accounts={accounts}
          lockedAccountId={lockedAccountId}
          fetcher={fetcher}
          defaultDate={defaultDate}
        />
      )}
      <FormErrorMessage />
    </FieldGroup>
  );
}

function SimpleForm({
  accounts,
  lockedAccountId,
  defaultDate,
}: {
  accounts: AccountOption[];
  lockedAccountId: string;
  defaultDate?: string;
}) {
  defaultDate = defaultDate ?? formatISODate(today());
  const [date, setDate] = useState<string>(defaultDate ?? "");
  const [value, setValue] = useState<number>();
  const selectedAccount = accounts.find((a) => a.id === lockedAccountId);
  const unit = selectedAccount?.unit ?? "CURRENCY";
  const currency = selectedAccount?.currency ?? "";
  const cryptocurrency = selectedAccount?.cryptocurrency ?? "";
  const symbol = selectedAccount?.symbol ?? "";
  const { fetcher } = useFormDialogContext();
  return (
    <>
      <div className="flex flex-col gap-8 sm:grid sm:grid-cols-12 sm:gap-4">
        <Field className="col-span-3">
          <Label>Date</Label>
          <DateInput
            name="bookings[0][date]"
            onChange={(value) => setDate(value?.toString() ?? "")}
            defaultValue={defaultDate}
            autoFocus
            invalid={!!fetcher.data?.errors?.[`bookings[0][date]`]}
          />
          {fetcher.data?.errors?.[`bookings[0][date]`] && (
            <ErrorMessage>
              {fetcher.data?.errors?.[`bookings[0][date]`]}
            </ErrorMessage>
          )}
          <input type="hidden" name="bookings[1][date]" value={date} />
        </Field>
        <Field className="col-span-9">
          <Label>Account</Label>
          <AccountCombobox
            accounts={accounts}
            name="bookings[1][accountId]"
            invalid={!!fetcher.data?.errors?.[`bookings[1][accountId]`]}
          />
          {fetcher.data?.errors?.[`bookings[1][accountId]`] && (
            <ErrorMessage>
              {fetcher.data?.errors?.[`bookings[1][accountId]`]}
            </ErrorMessage>
          )}
          <input
            type="hidden"
            name="bookings[0][accountId]"
            value={lockedAccountId}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-8 sm:grid sm:grid-cols-12 sm:gap-4">
        <Field className="col-span-4">
          <Label>Description (optional)</Label>
          <Input
            type="text"
            name="description"
            invalid={!!fetcher.data?.errors?.description}
          />
          {fetcher.data?.errors?.description && (
            <ErrorMessage>{fetcher.data?.errors?.description}</ErrorMessage>
          )}
        </Field>
        <Field className="col-span-3">
          <Label>Unit</Label>
          <UnitListbox disabled={true} value={unit} />
          <input type="hidden" name={`bookings[0][unit]`} value={unit} />
          <input type="hidden" name={`bookings[1][unit]`} value={unit} />
        </Field>
        <Field className="col-span-2">
          {unit === Unit.CURRENCY ? (
            <>
              <Label>Currency</Label>
              <CurrencyCombobox value={currency ?? ""} disabled={true} />
              <input
                type="hidden"
                name={`bookings[0][currency]`}
                value={currency ?? ""}
              />
              <input
                type="hidden"
                name={`bookings[1][currency]`}
                value={currency ?? ""}
              />
            </>
          ) : unit === Unit.CRYPTOCURRENCY ? (
            <>
              <Label>Cryptoccy.</Label>
              <CryptocurrencyCombobox
                value={cryptocurrency ?? ""}
                disabled={true}
              />
              <input
                type="hidden"
                name={`bookings[0][cryptocurrency]`}
                value={cryptocurrency ?? ""}
              />
              <input
                type="hidden"
                name={`bookings[1][cryptocurrency]`}
                value={cryptocurrency ?? ""}
              />
            </>
          ) : (
            <>
              <Label>Symbol</Label>
              <Input value={symbol ?? ""} disabled={true} />
              <input
                type="hidden"
                name={`bookings[0][symbol]`}
                value={symbol ?? ""}
              />
              <input
                type="hidden"
                name={`bookings[1][symbol]`}
                value={symbol ?? ""}
              />
            </>
          )}
        </Field>
        <Field className="col-span-3">
          <Label>Value</Label>
          <FormattedNumberInput
            onValueChange={({ floatValue }) => setValue(floatValue)}
            name="bookings[0][value]"
            invalid={!!fetcher.data?.errors?.[`bookings[0][value]`]}
          />
          <input
            type="hidden"
            name="bookings[1][value]"
            value={value ? -value : undefined}
          />
          {fetcher.data?.errors?.[`bookings[0][value]`] && (
            <ErrorMessage>
              {fetcher.data?.errors?.[`bookings[0][value]`]}
            </ErrorMessage>
          )}
        </Field>
      </div>
    </>
  );
}
