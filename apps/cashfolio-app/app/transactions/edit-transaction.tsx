import { Button } from "~/platform/button";
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
import { PlusIcon, TrashIcon } from "~/platform/icons/standard";
import { useFetcher } from "react-router";
import { createId } from "@paralleldrive/cuid2";
import type { Serialize } from "~/serialization";
import type { Booking } from "~/.prisma-client/client";
import { CurrencyCombobox } from "../components/currency-combobox";
import { formatISO } from "date-fns";
import type { TransactionWithBookings } from "~/transactions/types";
import { CryptocurrencyCombobox } from "~/components/cryptocurrency-combobox";
import type { action } from "./actions/create";
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
import { Divider } from "~/platform/divider";
import * as Headless from "@headlessui/react";
import { Subheading } from "~/platform/heading";

type BookingFormValues = Serialize<
  Pick<
    Booking,
    | "id"
    | "date"
    | "description"
    | "accountId"
    | "currency"
    | "cryptocurrency"
    | "unit"
  >
> & { value: string; isAccountLocked?: true };

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
            accounts={accounts}
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
        <>
          <Field>
            <Label>Description (optional)</Label>
            <Input
              type="text"
              name="description"
              defaultValue={transaction?.description}
              invalid={!!fetcher.data?.errors?.description}
            />
          </Field>
          <BookingsTable
            transaction={transaction}
            accounts={accounts}
            lockedAccountId={lockedAccountId}
            data={fetcher.data}
          />
        </>
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
  const currency =
    accounts.find((a) => a.id === lockedAccountId)!.currency ?? "";
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
        <Field className="col-span-7">
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
        <Field className="col-span-2">
          <Label>Currency</Label>
          <CurrencyCombobox
            placeholder="Ccy."
            value={currency ?? ""}
            disabled={true}
          />
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

function BookingsTable({
  transaction,
  accounts,
  lockedAccountId,
  data,
}: {
  transaction?: Serialize<TransactionWithBookings>;
  accounts: AccountOption[];
  lockedAccountId: string;
  data: ReturnType<typeof useFetcher<typeof action>>["data"];
}) {
  const [bookings, setBookings] = useState<BookingFormValues[]>(
    transaction
      ? transaction.bookings.map((b) => ({
          ...b,
          isAccountLocked: b.accountId === lockedAccountId ? true : undefined,
          date: formatISO(b.date, { representation: "date" }),
          value: b.value.toString(),
        }))
      : addNewBooking(addNewBooking([], { lockedAccountId })),
  );
  return (
    <>
      <FieldGroup>
        {bookings.map((booking, i) => {
          const selectedAccount = accounts.find(
            (a) => a.id === booking.accountId,
          );
          return (
            <>
              <div className="flex gap-4">
                <div className="w-36 flex items-center justify-center">
                  <span className="text-neutral-400 text-sm font-medium">
                    #{i + 1}
                  </span>
                </div>
                <FieldGroup>
                  <div className="grid grid-cols-24 gap-4">
                    <Field className="col-span-7">
                      <DateInput
                        name={`bookings[${i}][date]`}
                        defaultValue={booking.date}
                        onChange={(d) => {
                          setBookings(
                            bookings.map((b) =>
                              b.id === booking.id
                                ? { ...b, date: d ? d.toString() : "" }
                                : b,
                            ),
                          );
                        }}
                        invalid={!!data?.errors?.[`bookings[${i}][date]`]}
                      />
                    </Field>
                    <Field className="col-span-17">
                      <AccountCombobox
                        placeholder="Select account"
                        disabled={booking.isAccountLocked}
                        name={`bookings[${i}][accountId]`}
                        accounts={accounts}
                        defaultValue={booking.accountId}
                        onChange={(accountId) => {
                          setBookings(
                            bookings.map((b) =>
                              b.id === booking.id
                                ? { ...b, accountId: accountId ?? "" }
                                : b,
                            ),
                          );
                        }}
                        invalid={!!data?.errors?.[`bookings[${i}][accountId]`]}
                      />
                      {booking.isAccountLocked && (
                        <input
                          type="hidden"
                          name={`bookings[${i}][accountId]`}
                          value={booking.accountId}
                        />
                      )}
                    </Field>
                  </div>
                  <div className="grid grid-cols-24 gap-4">
                    <Field className="col-span-14">
                      <Input
                        placeholder="Description (optional)"
                        name={`bookings[${i}][description]`}
                        type="text"
                        defaultValue={booking.description}
                        invalid={
                          !!data?.errors?.[`bookings[${i}][description]`]
                        }
                      />
                    </Field>
                    <Field className="col-span-4">
                      {/* TODO support SECURITY accounts */}
                      {selectedAccount?.unit === "CURRENCY" ? (
                        <>
                          <CurrencyCombobox
                            placeholder="Ccy."
                            value={selectedAccount?.currency ?? ""}
                            disabled={true}
                          />
                          <input
                            type="hidden"
                            name={`bookings[${i}][currency]`}
                            value={selectedAccount?.currency ?? ""}
                          />
                        </>
                      ) : selectedAccount?.unit === "CRYPTOCURRENCY" ? (
                        <>
                          <CryptocurrencyCombobox
                            placeholder="Ccy."
                            value={selectedAccount?.cryptocurrency ?? ""}
                            disabled={true}
                          />
                          <input
                            type="hidden"
                            name={`bookings[${i}][cryptocurrency]`}
                            value={selectedAccount?.cryptocurrency ?? ""}
                          />
                        </>
                      ) : (
                        // TODO determine how we solve this. An Equity account does not have a unit because bookings can have any unit
                        <CurrencyCombobox
                          placeholder="Ccy."
                          name={`bookings[${i}][currency]`}
                          defaultValue={booking.currency ?? ""}
                          invalid={!!data?.errors?.[`bookings[${i}][currency]`]}
                        />
                      )}
                    </Field>
                    <Field className="col-span-6">
                      <FormattedNumberInput
                        placeholder="Value"
                        name={`bookings[${i}][value]`}
                        defaultValue={booking.value}
                        invalid={!!data?.errors?.[`bookings[${i}][value]`]}
                      />
                    </Field>
                  </div>
                </FieldGroup>
                <div className="w-36 flex items-center justify-center">
                  <Button
                    disabled={bookings.length <= 2 || booking.isAccountLocked}
                    hierarchy="tertiary"
                    onClick={() =>
                      setBookings(bookings.filter((b) => b.id !== booking.id))
                    }
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
              <Divider />
            </>
          );
        })}

        <div className="flex justify-center">
          <Button
            type="button"
            hierarchy="secondary"
            onClick={() => setBookings(addNewBooking(bookings))}
          >
            <PlusIcon />
            Add booking
          </Button>
        </div>
      </FieldGroup>
    </>
  );
}

function addNewBooking(
  bookings: BookingFormValues[],
  { lockedAccountId }: { lockedAccountId?: string } = {},
) {
  return [
    ...bookings,
    {
      id: createId(),
      date:
        bookings[bookings.length - 1]?.date ??
        formatISO(new Date(), { representation: "date" }),
      description: "",
      currency: "",
      accountId: lockedAccountId ?? "",
      isAccountLocked: !!lockedAccountId,
      value: "",
    } as BookingFormValues,
  ];
}
