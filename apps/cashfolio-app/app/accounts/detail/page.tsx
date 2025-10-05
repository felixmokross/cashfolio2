import {
  EditTransaction,
  useEditTransaction,
} from "~/transactions/edit-transaction";
import type { LoaderData } from "./route";
import {
  DeleteTransaction,
  useDeleteTransaction,
} from "~/transactions/delete-transaction";
import { Heading } from "~/platform/heading";
import { Button } from "~/platform/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { formatDate, formatMoney } from "~/formatting";
import { Fragment } from "react/jsx-runtime";
import { TextLink } from "~/platform/text";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "~/platform/dropdown";
import {
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
} from "~/platform/icons/standard";
import { Badge } from "~/platform/badge";
import { isSameUnit } from "~/fx";
import { useAccountBook } from "~/account-books/hooks";

export function Page({
  loaderData: { account, allAccounts, ledgerUnit, openingBalance, ledgerRows },
}: {
  loaderData: LoaderData;
}) {
  const { editTransactionProps, onNewTransaction, onEditTransaction } =
    useEditTransaction();

  const { deleteTransactionProps, onDeleteTransaction } =
    useDeleteTransaction();

  const accountBook = useAccountBook();

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading className="flex items-center gap-4">
          {account.path}
          <div className="flex items-center gap-2">
            <Badge>
              {ledgerUnit.unit === "CURRENCY"
                ? ledgerUnit.currency!
                : ledgerUnit.unit === "CRYPTOCURRENCY"
                  ? ledgerUnit.cryptocurrency!
                  : ledgerUnit.unit === "SECURITY"
                    ? ledgerUnit.symbol
                    : null}
            </Badge>
            {!account.isActive && (
              <Badge color="accent-negative">Inactive</Badge>
            )}
          </div>
        </Heading>

        <Button hierarchy="primary" onClick={() => onNewTransaction()}>
          New Transaction
        </Button>
      </div>

      <EditTransaction
        {...editTransactionProps}
        accounts={allAccounts}
        lockedAccountId={account.id}
      />
      <DeleteTransaction {...deleteTransactionProps} />

      <Table
        fixedLayout
        dense
        bleed
        striped
        className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]"
      >
        <TableHead>
          <TableRow>
            <TableHeader className="w-32">Date</TableHeader>
            <TableHeader>Account(s)</TableHeader>
            <TableHeader>Description</TableHeader>
            {account.type === "EQUITY" && (
              <TableHeader className="w-32 text-right">Value (FX)</TableHeader>
            )}
            <TableHeader className="w-32 text-right">Value</TableHeader>
            <TableHeader className="w-32 text-right">Balance</TableHeader>
            <TableHeader className="w-4">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {ledgerRows.map((lr) => (
            <TableRow
              key={lr.booking?.id ?? "opening-balance"}
              className="group"
            >
              <TableCell>{formatDate(lr.booking.date)}</TableCell>
              <TableCell className="truncate">
                {Array.from(
                  new Set(
                    lr.booking.transaction.bookings
                      .map((b) => b.accountId)
                      .filter((accountId) => accountId !== account.id),
                  ),
                ).map((accountId, i, arr) => (
                  <Fragment key={accountId}>
                    <TextLink href={`/${accountBook.id}/accounts/${accountId}`}>
                      {allAccounts.find((a) => a.id === accountId)?.name}
                    </TextLink>
                    {i < arr.length - 1 ? ", " : null}
                  </Fragment>
                ))}
              </TableCell>
              <TableCell className="truncate">
                {lr.booking.transaction.description} {lr.booking.description}
              </TableCell>
              {account.type === "EQUITY" && (
                <TableCell className="text-right">
                  {isSameUnit(
                    lr.booking.unit === "CURRENCY"
                      ? { unit: "CURRENCY", currency: account.currency! }
                      : account.unit === "CRYPTOCURRENCY"
                        ? {
                            unit: "CRYPTOCURRENCY",
                            cryptocurrency: account.cryptocurrency!,
                          }
                        : {
                            unit: "SECURITY",
                            symbol: account.symbol!,
                            tradeCurrency: account.tradeCurrency!,
                          },
                    ledgerUnit,
                  )
                    ? `${lr.booking.currency} ${formatMoney(lr.booking.value)}`
                    : null}
                </TableCell>
              )}
              <TableCell className="text-right">
                {formatMoney(lr.valueInLedgerUnit)}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(lr.balance)}
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownButton
                    as="button"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <EllipsisVerticalIcon className="-mb-0.5 size-4" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end">
                    <DropdownItem
                      onClick={() => onEditTransaction(lr.booking!.transaction)}
                    >
                      <PencilSquareIcon />
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        onDeleteTransaction(lr.booking!.transactionId)
                      }
                    >
                      <TrashIcon />
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
            </TableRow>
          ))}
          {openingBalance != null && (
            <TableRow>
              <TableCell />
              <TableCell />
              <TableCell colSpan={2}>
                <em>Opening balance</em>
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(openingBalance)}
              </TableCell>
              <TableCell />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
