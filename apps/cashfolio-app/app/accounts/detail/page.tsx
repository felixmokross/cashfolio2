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

export function Page({
  loaderData: { account, allAccounts, ledgerCurrency, ledgerRows },
}: {
  loaderData: LoaderData;
}) {
  const { editTransactionProps, onNewTransaction, onEditTransaction } =
    useEditTransaction({
      returnToAccountId: account.id,
      accounts: allAccounts,
    });

  const { deleteTransactionProps, onDeleteTransaction } = useDeleteTransaction({
    returnToAccountId: account.id,
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading>{account.path}</Heading>

        <Button hierarchy="primary" onClick={() => onNewTransaction()}>
          New Transaction
        </Button>
      </div>

      <EditTransaction {...editTransactionProps} />
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
            <TableHeader className="w-8">Ccy.</TableHeader>
            <TableHeader className="w-32 text-right">Value</TableHeader>
            <TableHeader className="w-32 text-right">
              Value ({ledgerCurrency})
            </TableHeader>
            <TableHeader className="w-32 text-right">Balance</TableHeader>
            <TableHeader className="w-4">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {ledgerRows.map((lr) => (
            <TableRow key={lr.booking?.id ?? "opening-balance"}>
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
                    <TextLink href={`/accounts/${accountId}`}>
                      {allAccounts.find((a) => a.id === accountId)?.name}
                    </TextLink>
                    {i < arr.length - 1 ? ", " : null}
                  </Fragment>
                ))}
              </TableCell>
              <TableCell className="truncate">
                {lr.booking.transaction.description} {lr.booking.description}
              </TableCell>
              <TableCell>{lr.booking.currency}</TableCell>
              <TableCell className="text-right">
                {formatMoney(lr.booking.value)}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(lr.valueInAccountCurrency)}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(lr.balance)}
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownButton hierarchy="tertiary">
                    <EllipsisVerticalIcon />
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
        </TableBody>
      </Table>
    </>
  );
}
