import { createId } from "@paralleldrive/cuid2";
import { type Dispatch } from "react";
import type { FetcherWithComponents, useFetcher } from "react-router";
import { Unit } from "~/.prisma-client/enums";
import { AccountCombobox } from "~/accounts/account-combobox";
import { CryptocurrencyCombobox } from "~/components/cryptocurrency-combobox";
import { CurrencyCombobox } from "~/components/currency-combobox";
import { Divider } from "~/platform/divider";
import { DateInput } from "~/platform/forms/date-input";
import {
  ErrorMessage,
  Field,
  FieldGroup,
  Label,
} from "~/platform/forms/fieldset";
import type { FetcherData } from "~/platform/forms/form-dialog";
import { FormattedNumberInput } from "~/platform/forms/formatted-number-input";
import type { Serialize } from "~/serialization";
import type { AccountOption } from "~/types";
import type { action } from "./actions/create";
import type { TransactionWithBookings } from "./types";
import { PlusIcon, TrashIcon } from "~/platform/icons/standard";
import { Input } from "~/platform/forms/input";
import { Button } from "~/platform/button";
import type { Booking } from "~/.prisma-client/client";
import { UnitListbox } from "~/units/unit-listbox";

export function SplitTransactionForm({
  accounts,
  fetcher,
  bookings,
  setBookings,
  description,
  setDescription,
}: {
  accounts: AccountOption[];
  fetcher: FetcherWithComponents<FetcherData>;
  description: string;
  setDescription: Dispatch<React.SetStateAction<string>>;
  bookings: BookingFormValues[];
  setBookings: Dispatch<React.SetStateAction<BookingFormValues[]>>;
}) {
  return (
    <>
      <Field>
        <Label>Description (optional)</Label>
        <Input
          type="text"
          name="description"
          invalid={!!fetcher.data?.errors?.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <BookingsTable
        bookings={bookings}
        setBookings={setBookings}
        accounts={accounts}
        data={fetcher.data}
      />
    </>
  );
}

function BookingsTable({
  accounts,
  data,
  bookings,
  setBookings,
}: {
  accounts: AccountOption[];
  data: ReturnType<typeof useFetcher<typeof action>>["data"];
  bookings: BookingFormValues[];
  setBookings: Dispatch<React.SetStateAction<BookingFormValues[]>>;
}) {
  return (
    <>
      <FieldGroup>
        {bookings.map((booking, i) => {
          const selectedAccount = accounts.find(
            (a) => a.id === booking.accountId,
          );

          function updateBooking(updatedFields: Partial<BookingFormValues>) {
            setBookings((bookings) =>
              bookings.map((b) =>
                b.id === booking.id ? { ...b, ...updatedFields } : b,
              ),
            );
          }

          function deleteBooking() {
            setBookings((bookings) =>
              bookings.filter((b) => b.id !== booking.id),
            );
          }

          function fieldName(bookingProperty: keyof BookingFormValues) {
            return `bookings[${i}][${bookingProperty}]`;
          }

          function fieldError(bookingProperty: keyof BookingFormValues) {
            return data?.errors?.[fieldName(bookingProperty)];
          }

          return (
            <>
              <div className="flex gap-4">
                <div className="w-32 flex items-center justify-center">
                  <span className="text-neutral-400 text-sm font-medium">
                    #{i + 1}
                  </span>
                </div>
                <FieldGroup>
                  <div className="grid grid-cols-24 gap-4">
                    <Field className="col-span-7">
                      <Label>Date</Label>
                      <DateInput
                        name={fieldName("date")}
                        value={booking.date}
                        onChange={(d) =>
                          updateBooking({ date: d ? d.toString() : "" })
                        }
                        invalid={!!fieldError("date")}
                      />
                      {!!fieldError("date") && (
                        <ErrorMessage>{fieldError("date")}</ErrorMessage>
                      )}
                    </Field>
                    <Field className="col-span-17">
                      <Label>Account</Label>
                      <AccountCombobox
                        disabled={booking.isAccountLocked}
                        name={fieldName("accountId")}
                        accounts={accounts}
                        value={booking.accountId}
                        onChange={(accountId) => {
                          const newAccount = accounts.find(
                            (a) => a.id === accountId,
                          );
                          updateBooking({
                            accountId: accountId ?? "",
                            unit: newAccount?.unit ?? Unit.CURRENCY,
                            currency: newAccount?.currency ?? "",
                            cryptocurrency: newAccount?.cryptocurrency ?? "",
                            symbol: newAccount?.symbol ?? "",
                          });
                        }}
                        invalid={!!fieldError("accountId")}
                      />
                      {booking.isAccountLocked && (
                        <input
                          type="hidden"
                          name={fieldName("accountId")}
                          value={booking.accountId}
                        />
                      )}
                      {!!fieldError("accountId") && (
                        <ErrorMessage>{fieldError("accountId")}</ErrorMessage>
                      )}
                    </Field>
                  </div>
                  <div className="grid grid-cols-24 gap-4">
                    <Field className="col-span-6">
                      <Label>Description (opt.)</Label>
                      <Input
                        name={fieldName("description")}
                        type="text"
                        value={booking.description}
                        onChange={(e) =>
                          updateBooking({ description: e.target.value })
                        }
                        invalid={!!fieldError("description")}
                      />
                      {!!fieldError("description") && (
                        <ErrorMessage>{fieldError("description")}</ErrorMessage>
                      )}
                    </Field>
                    <Field className="col-span-6">
                      <Label>Unit</Label>
                      <UnitListbox
                        disabled={!!selectedAccount?.unit}
                        name={fieldName("unit")}
                        value={booking.unit}
                        onChange={(unit) => {
                          updateBooking({
                            unit,
                            currency: "",
                            cryptocurrency: "",
                            symbol: "",
                          });
                        }}
                      />
                      {!!selectedAccount?.unit && (
                        <input
                          type="hidden"
                          name={fieldName("unit")}
                          value={selectedAccount.unit}
                        />
                      )}
                      {!!fieldError("unit") && (
                        <ErrorMessage>{fieldError("unit")}</ErrorMessage>
                      )}
                    </Field>
                    <Field className="col-span-7">
                      {booking.unit === Unit.CURRENCY ? (
                        <>
                          <Label>Currency</Label>
                          <CurrencyCombobox
                            name={fieldName("currency")}
                            value={booking.currency ?? ""}
                            onChange={(currency) => updateBooking({ currency })}
                            disabled={!!selectedAccount?.currency}
                          />
                          {!!selectedAccount?.currency && (
                            <input
                              type="hidden"
                              name={fieldName("currency")}
                              value={booking.currency ?? ""}
                            />
                          )}
                          {!!fieldError("currency") && (
                            <ErrorMessage>
                              {fieldError("currency")}
                            </ErrorMessage>
                          )}
                        </>
                      ) : booking.unit === Unit.CRYPTOCURRENCY ? (
                        <>
                          <Label>Cryptocurrency</Label>
                          <CryptocurrencyCombobox
                            name={fieldName("cryptocurrency")}
                            value={booking.cryptocurrency ?? ""}
                            onChange={(cryptocurrency) =>
                              updateBooking({ cryptocurrency })
                            }
                            disabled={!!selectedAccount?.cryptocurrency}
                          />
                          {!!selectedAccount?.cryptocurrency && (
                            <input
                              type="hidden"
                              name={fieldName("cryptocurrency")}
                              value={booking.cryptocurrency ?? ""}
                            />
                          )}
                          {!!fieldError("cryptocurrency") && (
                            <ErrorMessage>
                              {fieldError("cryptocurrency")}
                            </ErrorMessage>
                          )}
                        </>
                      ) : booking.unit === Unit.SECURITY ? (
                        <>
                          <Label>Symbol</Label>
                          <Input
                            name={fieldName("symbol")}
                            value={booking.symbol ?? ""}
                            onChange={(e) =>
                              updateBooking({ symbol: e.target.value })
                            }
                            disabled={!!selectedAccount?.symbol}
                          />
                          {!!selectedAccount?.symbol && (
                            <input
                              type="hidden"
                              name={fieldName("symbol")}
                              value={booking.symbol ?? ""}
                            />
                          )}
                          {!!fieldError("symbol") && (
                            <ErrorMessage>{fieldError("symbol")}</ErrorMessage>
                          )}
                        </>
                      ) : null}
                    </Field>
                    <Field className="col-span-5">
                      <Label>Value</Label>
                      <FormattedNumberInput
                        placeholder="Value"
                        name={fieldName("value")}
                        value={booking.value}
                        onValueChange={({ value }) => updateBooking({ value })}
                        invalid={!!fieldError("value")}
                      />
                      {!!fieldError("value") && (
                        <ErrorMessage>{fieldError("value")}</ErrorMessage>
                      )}
                    </Field>
                  </div>
                </FieldGroup>
                <div className="w-32 flex items-center justify-center">
                  <Button
                    disabled={bookings.length <= 2 || booking.isAccountLocked}
                    hierarchy="tertiary"
                    onClick={() => deleteBooking()}
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

export function addNewBooking(
  bookings: BookingFormValues[],
  {
    lockedAccount,
    defaultDate,
  }: { lockedAccount?: AccountOption; defaultDate?: string } = {},
) {
  return [
    ...bookings,
    {
      id: createId(),
      date: bookings[bookings.length - 1]?.date ?? defaultDate,
      description: "",
      accountId: lockedAccount?.id ?? "",
      isAccountLocked: !!lockedAccount || undefined,
      unit: lockedAccount?.unit ?? Unit.CURRENCY,
      currency: lockedAccount?.currency ?? "",
      cryptocurrency: lockedAccount?.cryptocurrency ?? "",
      symbol: lockedAccount?.symbol ?? "",
      value: "",
    } as BookingFormValues,
  ];
}

export type BookingFormValues = Serialize<
  Pick<
    Booking,
    | "id"
    | "date"
    | "description"
    | "accountId"
    | "currency"
    | "cryptocurrency"
    | "symbol"
    | "unit"
  >
> & { value: string; isAccountLocked: boolean; isUnitLocked: boolean };
