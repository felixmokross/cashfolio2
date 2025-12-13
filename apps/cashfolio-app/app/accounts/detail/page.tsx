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
import { formatDate, formatISODate, formatMoney } from "~/formatting";
import { Fragment } from "react/jsx-runtime";
import { TextLink } from "~/platform/text";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
} from "~/platform/dropdown";
import {
  ArrowRightStartOnRectangleIcon,
  EllipsisVerticalIcon,
  ListBulletIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from "~/platform/icons/standard";
import { Badge } from "~/platform/badge";
import { useAccountBook } from "~/account-books/hooks";
import { EditAccount, useEditAccount } from "../edit-account";
import { DeleteAccount, useDeleteAccount } from "../delete-account";
import { getUnitInfo, getUnitLabel, isSameUnit } from "~/units/functions";
import { Rebook, useRebook } from "~/transactions/rebook";
import { PeriodSelector } from "~/period/period-selector";
import { useNavigate } from "react-router";
import { parseISO } from "date-fns";
import { isSplitTransaction } from "~/transactions/functions";

export function Page({
  loaderData: {
    account,
    allAccounts,
    ledgerUnitInfo,
    openingBalance,
    ledgerRows,
    accountGroups,
    period,
    periodSpecifier,
    minBookingDate,
  },
}: {
  loaderData: LoaderData;
}) {
  const { editAccountProps, onEditAccount } = useEditAccount();
  const { deleteAccountProps, onDeleteAccount } = useDeleteAccount();

  const { editTransactionProps, onNewTransaction, onEditTransaction } =
    useEditTransaction();

  const { deleteTransactionProps, onDeleteTransaction } =
    useDeleteTransaction();

  const { rebookProps: moveBookingProps, onRebook: onMoveBooking } =
    useRebook();

  const accountBook = useAccountBook();
  const navigate = useNavigate();

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading className="flex items-center gap-4">
          {account.groupPath} / {account.name}
          <div className="flex items-center gap-2">
            <Badge>{getUnitLabel(ledgerUnitInfo)}</Badge>
            {!account.isActive && (
              <Badge color="accent-negative">Inactive</Badge>
            )}
          </div>
        </Heading>

        <EditAccount {...editAccountProps} accountGroups={accountGroups} />
        <DeleteAccount {...deleteAccountProps} />

        <div className="flex gap-4">
          {account.isActive && (
            <Button hierarchy="primary" onClick={() => onNewTransaction()}>
              <PlusCircleIcon />
              New Transaction
            </Button>
          )}
          <Dropdown>
            <DropdownButton as={Button} hierarchy="secondary">
              <EllipsisVerticalIcon />
              <span className="sr-only">Account Actions</span>
            </DropdownButton>
            <DropdownMenu>
              <DropdownItem onClick={() => onEditAccount(account)}>
                <PencilSquareIcon />
                Edit Account
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem onClick={() => onDeleteAccount(account.id)}>
                <TrashIcon />
                Delete Account
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <EditTransaction
        {...editTransactionProps}
        accounts={allAccounts}
        lockedAccountId={account.id}
        defaultDate={
          ledgerRows[0]?.booking.date
            ? formatISODate(parseISO(ledgerRows[0].booking.date))
            : undefined
        }
      />
      <DeleteTransaction {...deleteTransactionProps} />
      <Rebook
        {...moveBookingProps}
        accounts={allAccounts}
        currentAccount={account}
      />

      <PeriodSelector
        className="mt-12"
        period={period}
        periodSpecifier={periodSpecifier}
        minBookingDate={minBookingDate}
        onNavigate={(newPeriodOrPeriodSpecifier) =>
          navigate(`../accounts/${account.id}/${newPeriodOrPeriodSpecifier}`)
        }
      />

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
            <TableRow key={lr.booking.id} className="group">
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
                {isSplitTransaction(lr.booking.transaction.bookings) && (
                  <>
                    <Badge color="accent-neutral">
                      <ListBulletIcon
                        className="size-3"
                        title="Split Transaction"
                      />
                    </Badge>{" "}
                  </>
                )}
                {lr.booking.transaction.description} {lr.booking.description}
              </TableCell>
              {account.type === "EQUITY" && (
                <TableCell className="text-right">
                  {!isSameUnit(getUnitInfo(lr.booking), ledgerUnitInfo)
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
                      onClick={() => onEditTransaction(lr.booking.transaction)}
                    >
                      <PencilSquareIcon />
                      Edit
                    </DropdownItem>
                    <DropdownItem onClick={() => onMoveBooking(lr.booking)}>
                      <ArrowRightStartOnRectangleIcon />
                      Rebook
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() =>
                        onDeleteTransaction(lr.booking.transactionId)
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
