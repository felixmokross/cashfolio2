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
import { useEffect, useState, type Dispatch } from "react";
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
import {
  addNewBooking,
  SplitTransactionForm,
  type BookingFormValues,
} from "./split-transaction-form";
import { UnitListbox } from "~/units/unit-listbox";
import { Unit } from "~/.prisma-client/enums";
import { CryptocurrencyCombobox } from "~/components/cryptocurrency-combobox";
import { formatISO } from "date-fns";

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
  return (
    <FormDialog
      size="3xl"
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
      <TransactionFormGroup
        accounts={accounts.filter(
          (a) =>
            a.isActive ||
            transaction?.bookings.map((b) => b.accountId).includes(a.id),
        )}
        transaction={transaction}
        lockedAccountId={lockedAccountId}
        defaultDate={defaultDate}
        createAnother={createAnother}
        setCreateAnother={setCreateAnother}
      />
    </FormDialog>
  );
}

function TransactionFormGroup({
  accounts,
  transaction,
  lockedAccountId,
  defaultDate,
  createAnother,
  setCreateAnother,
}: {
  accounts: AccountOption[];
  transaction?: Serialize<TransactionWithBookings>;
  lockedAccountId: string;
  defaultDate?: string;
  createAnother: boolean;
  setCreateAnother: Dispatch<React.SetStateAction<boolean>>;
}) {
  const { fetcher } = useFormDialogContext();
  const [bookings, setBookings] = useState<BookingFormValues[]>(
    transaction
      ? transaction.bookings.map((b) => ({
          ...b,
          isUnitLocked: !!accounts.find((a) => a.id === b.accountId),
          isAccountLocked: b.accountId === lockedAccountId,
          date: formatISO(b.date, { representation: "date" }),
          value: b.value.toString(),
        }))
      : addNewBooking(
          addNewBooking([], {
            lockedAccount: accounts.find((a) => a.id === lockedAccountId),
            defaultDate,
          }),
        ),
  );

  const requiresSplitMode =
    bookings.length > 2 ||
    new Set(
      bookings
        .filter(
          (b) =>
            (b.unit === Unit.CURRENCY && b.currency) ||
            (b.unit === Unit.CRYPTOCURRENCY && b.cryptocurrency) ||
            (b.unit === Unit.SECURITY && b.symbol),
        )
        .map((b) => `${b.unit}-${b.currency || b.cryptocurrency || b.symbol}`),
    ).size > 1;

  useEffect(() => {
    if (requiresSplitMode) {
      setMode("split");
    }
  }, [requiresSplitMode]);

  const [mode, setMode] = useState<InputMode>(
    requiresSplitMode ? "split" : "simple",
  );
  return (
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
            disabled={requiresSplitMode}
          />
          <Label>Split transaction</Label>
        </Headless.Field>
      </div>
      <DialogBody>
        <FieldGroup>
          {mode === "simple" ? (
            <SimpleForm
              accounts={accounts}
              lockedAccountId={lockedAccountId}
              bookings={bookings}
              setBookings={setBookings}
            />
          ) : (
            <SplitTransactionForm
              transaction={transaction}
              accounts={accounts}
              fetcher={fetcher}
              bookings={bookings}
              setBookings={setBookings}
            />
          )}
          <FormErrorMessage />
        </FieldGroup>
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
  );
}

function SimpleForm({
  accounts,
  lockedAccountId,
  bookings,
  setBookings,
}: {
  accounts: AccountOption[];
  lockedAccountId: string;
  bookings: BookingFormValues[];
  setBookings: Dispatch<React.SetStateAction<BookingFormValues[]>>;
}) {
  const { fetcher } = useFormDialogContext();

  function updateBooking(
    bookingId: string,
    updatedFields: Partial<BookingFormValues>,
  ) {
    setBookings((bookings) =>
      bookings.map((b) =>
        b.id === bookingId ? { ...b, ...updatedFields } : b,
      ),
    );
  }
  return (
    <>
      <div className="flex flex-col gap-8 sm:grid sm:grid-cols-12 sm:gap-4">
        <Field className="col-span-3">
          <Label>Date</Label>
          <DateInput
            name="bookings[0][date]"
            onChange={(value) =>
              updateBooking(bookings[0].id, { date: value?.toString() })
            }
            value={bookings[0].date}
            autoFocus
            invalid={!!fetcher.data?.errors?.[`bookings[0][date]`]}
          />
          {fetcher.data?.errors?.[`bookings[0][date]`] && (
            <ErrorMessage>
              {fetcher.data?.errors?.[`bookings[0][date]`]}
            </ErrorMessage>
          )}
          <input
            type="hidden"
            name="bookings[1][date]"
            value={bookings[1].date}
          />
        </Field>
        <Field className="col-span-9">
          <Label>To Account</Label>
          <AccountCombobox
            accounts={accounts}
            name="bookings[1][accountId]"
            value={bookings[1].accountId}
            onChange={(value) =>
              updateBooking(bookings[1].id, {
                accountId: value ?? undefined,
                unit: accounts.find((a) => a.id === value)?.unit ?? undefined,
                currency:
                  accounts.find((a) => a.id === value)?.currency ?? undefined,
                cryptocurrency:
                  accounts.find((a) => a.id === value)?.cryptocurrency ??
                  undefined,
                symbol:
                  accounts.find((a) => a.id === value)?.symbol ?? undefined,
              })
            }
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
          <UnitListbox disabled={true} value={bookings[0].unit} />
          <input
            type="hidden"
            name={`bookings[0][unit]`}
            value={bookings[0].unit}
          />
          <input
            type="hidden"
            name={`bookings[1][unit]`}
            value={bookings[1].unit}
          />
        </Field>
        <Field className="col-span-2">
          {bookings[0].unit === Unit.CURRENCY ? (
            <>
              <Label>Currency</Label>
              <CurrencyCombobox
                value={bookings[0].currency ?? ""}
                disabled={true}
              />
              <input
                type="hidden"
                name={`bookings[0][currency]`}
                value={bookings[0].currency ?? ""}
              />
              <input
                type="hidden"
                name={`bookings[1][currency]`}
                value={bookings[1].currency ?? ""}
              />
            </>
          ) : bookings[0].unit === Unit.CRYPTOCURRENCY ? (
            <>
              <Label>Cryptoccy.</Label>
              <CryptocurrencyCombobox
                value={bookings[0].cryptocurrency ?? ""}
                disabled={true}
              />
              <input
                type="hidden"
                name={`bookings[0][cryptocurrency]`}
                value={bookings[0].cryptocurrency ?? ""}
              />
              <input
                type="hidden"
                name={`bookings[1][cryptocurrency]`}
                value={bookings[1].cryptocurrency ?? ""}
              />
            </>
          ) : (
            <>
              <Label>Symbol</Label>
              <Input value={bookings[0].symbol ?? ""} disabled={true} />
              <input
                type="hidden"
                name={`bookings[0][symbol]`}
                value={bookings[0].symbol ?? ""}
              />
              <input
                type="hidden"
                name={`bookings[1][symbol]`}
                value={bookings[1].symbol ?? ""}
              />
            </>
          )}
        </Field>
        <Field className="col-span-3">
          <Label>Value</Label>
          <FormattedNumberInput
            value={bookings[1].value}
            onValueChange={({ floatValue }) =>
              updateBooking(bookings[1].id, { value: floatValue?.toString() })
            }
            name="bookings[1][value]"
            invalid={!!fetcher.data?.errors?.[`bookings[1][value]`]}
          />
          {fetcher.data?.errors?.[`bookings[1][value]`] && (
            <ErrorMessage>
              {fetcher.data?.errors?.[`bookings[1][value]`]}
            </ErrorMessage>
          )}
          <input
            type="hidden"
            name="bookings[0][value]"
            value={bookings[0].value ? -bookings[0].value : undefined}
          />
        </Field>
      </div>
    </>
  );
}
