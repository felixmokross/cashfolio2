import {
  Prisma,
  type Account,
  type Booking,
  type Transaction,
} from "@prisma/client";
import { useId } from "react";
import {
  Form,
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { Fragment } from "react/jsx-runtime";
import { Button } from "~/platform/button";
import { Combobox, ComboboxLabel, ComboboxOption } from "~/platform/combobox";
import { Heading } from "~/platform/heading";
import { Input } from "~/platform/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { prisma } from "~/prisma.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const [account, bookings, allAccounts] = await Promise.all([
    prisma.account.findUnique({ where: { id: params.accountId } }),
    prisma.booking.findMany({
      where: { accountId: params.accountId },
      include: {
        transaction: {
          include: {
            bookings: {
              include: { account: { select: { id: true, name: true } } },
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
          ? { ...lr.booking, value: lr.booking.value.toString() }
          : undefined,
        balance: lr.balance.toString(),
      }))
      .reverse(),
    allAccounts,
  };
}

type BookingWithAccountName = Booking & {
  account: { id: string; name: string };
};
type TransactionWithBookings = Transaction & {
  bookings: BookingWithAccountName[];
};
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
  const addFormId = useId();
  return (
    <>
      <Heading>{account.name}</Heading>

      <Table grid dense bleed striped>
        <TableHead>
          <TableRow>
            <TableHeader>Date</TableHeader>
            <TableHeader>Account(s)</TableHeader>
            <TableHeader>Description</TableHeader>
            <TableHeader className="text-right">Value</TableHeader>
            <TableHeader className="text-right">Balance</TableHeader>
          </TableRow>
          <TableRow>
            <TableCell className="w-36">
              <Input
                name="date"
                form={addFormId}
                type="text"
                placeholder="YYYY-MM-DD"
              />
            </TableCell>
            <TableCell className="w-80">
              <Combobox
                name="targetAccountId"
                form={addFormId}
                displayValue={(o) => o?.label ?? ""}
                placeholder="Account"
                options={allAccounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                }))}
              >
                {(option) => (
                  <ComboboxOption value={option}>
                    <ComboboxLabel>{option.label}</ComboboxLabel>
                  </ComboboxOption>
                )}
              </Combobox>
            </TableCell>
            <TableCell>
              <Input
                name="description"
                form={addFormId}
                type="text"
                placeholder="Description"
              />
            </TableCell>
            <TableCell className="w-36">
              <Input
                name="value"
                form={addFormId}
                type="text"
                placeholder="Value"
              />
            </TableCell>
            <TableCell>
              <Form
                id={addFormId}
                method="POST"
                action="/transactions"
                className="contents"
                onSubmit={(e) => e.currentTarget.reset()}
              >
                <input
                  type="hidden"
                  name="sourceAccountId"
                  value={account.id}
                />
                <Button type="submit">Add</Button>
              </Form>
            </TableCell>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
