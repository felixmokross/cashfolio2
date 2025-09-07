import { Button } from "~/platform/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/platform/dialog";
import { Field, FieldGroup, Label } from "~/platform/forms/fieldset";
import { Subheading } from "~/platform/heading";
import { Input } from "~/platform/forms/input";
import type { AccountOption } from "~/types";
import { AccountCombobox } from "./account-combobox";
import { DateInput } from "~/platform/forms/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { FormattedNumberInput } from "~/platform/forms/formatted-number-input";
import { useState } from "react";
import { number } from "motion/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/16/solid";

export function TransactionDialog({
  isOpen,
  onClose,
  accounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
}) {
  const [bookings, setBookings] = useState([{ id: 0 }, { id: 1 }]);
  return (
    <Dialog size="5xl" open={isOpen} onClose={onClose}>
      <DialogTitle>New Transaction</DialogTitle>
      <DialogBody>
        <FieldGroup>
          <Field>
            <Input type="text" placeholder="Description" />
          </Field>
          <div className="flex flex-col gap-4">
            <Table bleed className="[--gutter:--spacing(8)]">
              <TableHead>
                <TableRow>
                  <TableHeader className="w-48">Date</TableHeader>
                  <TableHeader>Account</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader className="w-36">Value</TableHeader>
                  <TableHeader className="w-5">
                    <span className="sr-only">Actions</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <DateInput name="date" />
                    </TableCell>
                    <TableCell>
                      <AccountCombobox accounts={accounts} />
                    </TableCell>
                    <TableCell>
                      <Input type="text" />
                    </TableCell>
                    <TableCell>
                      <FormattedNumberInput name="value" />
                    </TableCell>
                    <TableCell>
                      <Button
                        hierarchy="tertiary"
                        onClick={() =>
                          setBookings(
                            bookings.filter((b) => b.id !== booking.id),
                          )
                        }
                      >
                        <TrashIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Button
                      type="button"
                      hierarchy="secondary"
                      onClick={() =>
                        setBookings([
                          ...bookings,
                          {
                            id:
                              bookings.length > 0
                                ? Math.max(...bookings.map((b) => b.id)) + 1
                                : 0,
                          },
                        ])
                      }
                    >
                      <PlusIcon />
                      Add booking
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </FieldGroup>
      </DialogBody>
      <DialogActions>
        <Button hierarchy="tertiary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}
