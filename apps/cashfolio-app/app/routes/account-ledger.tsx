import { Prisma, type Account, type Booking } from "@prisma/client";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
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
import { TextLink } from "~/platform/text";
import { getAccountGroupPath } from "~/utils";
import { serialize } from "~/serialization";
import { formatDate, formatMoney } from "~/formatting";
import { convertToCurrency, refCurrency } from "~/fx.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const [account, bookings, allAccounts, accountGroups] = await Promise.all([
    prisma.account.findUnique({
      where: { id: params.accountId },
      include: { group: { include: {} } },
    }),
    prisma.booking.findMany({
      where: { accountId: params.accountId },
      include: {
        transaction: {
          include: { bookings: true },
        },
      },
      orderBy: [{ date: "asc" }, { transaction: { createdAt: "asc" } }],
    }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.accountGroup.findMany(),
  ]);
  if (!account) {
    throw new Response("Not Found", { status: 404 });
  }

  function getAccountPath(account: Account) {
    return `${getAccountGroupPath(account.groupId, accountGroups)} / ${
      account.name
    }`;
  }

  const ledgerCurrency = account.currency ?? refCurrency;

  return serialize({
    ledgerCurrency,
    account: {
      ...account,
      path: getAccountPath(account),
    },
    ledgerRows: (
      await getLedgerRows(account, bookings, ledgerCurrency)
    ).reverse(),
    allAccounts: allAccounts
      .map((a) => ({
        ...a,
        path: getAccountPath(a),
      }))
      .toSorted((a, b) => a.path.localeCompare(b.path)),
  });
}

type BookingWithTransaction = Booking & {
  transaction: TransactionWithBookings;
};
type LedgerRow = {
  booking?: BookingWithTransaction;
  valueInAccountCurrency?: Prisma.Decimal;
  balance: Prisma.Decimal;
};

async function getLedgerRows(
  account: Account,
  bookings: BookingWithTransaction[],
  ledgerCurrency: string,
) {
  const rows = new Array<LedgerRow>(bookings.length + 1);

  rows[0] = {
    balance: account.openingBalance ?? new Prisma.Decimal(0),
  };

  for (let i = 0; i < bookings.length; i++) {
    const valueInAccountCurrency = await convertToCurrency(
      bookings[i].value,
      bookings[i].currency,
      ledgerCurrency,
    );
    rows[i + 1] = {
      booking: bookings[i],
      valueInAccountCurrency,
      balance: rows[i].balance.add(valueInAccountCurrency),
    };
  }

  return rows;
}

export default function AccountLedger() {
  const { account, ledgerRows, allAccounts, ledgerCurrency } =
    useLoaderData<typeof loader>();
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
            <TableHeader className="w-24">Currency</TableHeader>
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
              <TableCell>
                {lr.booking ? formatDate(lr.booking.date) : null}
              </TableCell>
              <TableCell>
                {lr.booking &&
                  Array.from(
                    new Set(
                      lr.booking.transaction.bookings
                        .map((b) => b.accountId)
                        .filter((accountId) => accountId !== account.id),
                    ),
                  ).map((accountId, i, arr) => (
                    <Fragment key={accountId}>
                      <TextLink href={`/accounts/${accountId}`}>
                        {allAccounts.find((a) => a.id === accountId)?.path}
                      </TextLink>
                      {i < arr.length - 1 ? ", " : null}
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
              <TableCell>{lr.booking ? lr.booking.currency : null}</TableCell>
              <TableCell className="text-right">
                {lr.booking && formatMoney(lr.booking.value)}
              </TableCell>
              <TableCell className="text-right">
                {lr.valueInAccountCurrency
                  ? formatMoney(lr.valueInAccountCurrency)
                  : null}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(lr.balance)}
              </TableCell>
              <TableCell>
                {lr.booking && (
                  <Dropdown>
                    <DropdownButton hierarchy="tertiary">
                      <EllipsisVerticalIcon />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem
                        onClick={() =>
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
