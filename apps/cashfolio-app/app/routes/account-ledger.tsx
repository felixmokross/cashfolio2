import { Prisma, type Account, type Booking } from "@prisma/client";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Fragment } from "react/jsx-runtime";
import { Button } from "~/platform/button";
import { Heading } from "~/platform/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { prisma } from "~/prisma.server";
import {
  EditTransaction,
  useEditTransaction,
} from "~/components/edit-transaction";
import {
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "~/platform/dropdown";
import {
  DeleteTransaction,
  useDeleteTransaction,
} from "~/components/delete-transaction";
import type { TransactionWithBookings } from "~/types";

export async function loader({ params }: LoaderFunctionArgs) {
  const [account, bookings, allAccounts] = await Promise.all([
    prisma.account.findUnique({ where: { id: params.accountId } }),
    prisma.booking.findMany({
      where: { accountId: params.accountId },
      include: {
        transaction: {
          include: {
            bookings: {
              include: {
                account: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ date: "asc" }, { transaction: { createdAt: "asc" } }],
    }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!account) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    account: {
      ...account,
      openingBalance: account.openingBalance?.toString(),
    },
    ledgerRows: getLedgerRows(account, bookings)
      .map((lr) => ({
        ...lr,
        booking: lr.booking
          ? {
              ...lr.booking,
              value: lr.booking.value.toString(),
              transaction: {
                ...lr.booking.transaction,
                bookings: lr.booking.transaction.bookings.map((b) => ({
                  ...b,
                  value: b.value.toString(),
                })),
              },
            }
          : undefined,
        balance: lr.balance.toString(),
      }))
      .reverse(),
    allAccounts,
  };
}

type BookingWithTransaction = Booking & {
  transaction: TransactionWithBookings;
};
type LedgerRow = { booking?: BookingWithTransaction; balance: Prisma.Decimal };

function getLedgerRows(account: Account, bookings: BookingWithTransaction[]) {
  const rows = new Array<LedgerRow>(bookings.length + 1);

  rows[0] = { balance: account.openingBalance ?? new Prisma.Decimal(0) };

  for (let i = 0; i < bookings.length; i++) {
    rows[i + 1] = {
      booking: bookings[i],
      balance: rows[i].balance.add(bookings[i].value),
    };
  }

  return rows;
}

export default function AccountLedger() {
  const { account, ledgerRows, allAccounts } = useLoaderData<typeof loader>();
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
        <Heading>{account.name}</Heading>

        <Button hierarchy="primary" onClick={() => onNewTransaction()}>
          New Transaction
        </Button>
      </div>

      <EditTransaction {...editTransactionProps} />
      <DeleteTransaction {...deleteTransactionProps} />

      <Table
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
            <TableHeader className="w-32 text-right">Value</TableHeader>
            <TableHeader className="w-32 text-right">Balance</TableHeader>
            <TableHeader className="w-4">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {ledgerRows.map((lr) => (
            <TableRow key={lr.booking?.id ?? "opening-balance"}>
              <TableCell>
                {lr.booking?.date.toISOString().split("T")[0]}
              </TableCell>
              <TableCell>
                {lr.booking?.transaction.bookings
                  .filter((b) => b.accountId !== account.id)
                  .map((b) => b.account)
                  .map((a, i, { length }) => (
                    <Fragment key={a.id}>
                      <Link to={`/accounts/${a.id}`}>{a.name}</Link>
                      {i < length - 1 ? ", " : null}
                    </Fragment>
                  ))}
              </TableCell>
              <TableCell>
                {lr.booking ? (
                  <>
                    {lr.booking.transaction.description}{" "}
                    {lr.booking.description}
                  </>
                ) : (
                  "Opening Balance"
                )}
              </TableCell>
              <TableCell className="text-right">{lr.booking?.value}</TableCell>
              <TableCell className="text-right">{lr.balance}</TableCell>
              <TableCell>
                {lr.booking && (
                  <Dropdown>
                    <DropdownButton hierarchy="tertiary">
                      <EllipsisVerticalIcon />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem
                        onClick={() =>
                          // @ts-expect-error types don't match here since it was serialized
                          // TODO properly type
                          onEditTransaction(lr.booking!.transaction)
                        }
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
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
