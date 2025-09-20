import { Prisma, type Account } from "@prisma/client";
import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { getAccountGroupPath } from "~/utils";
import { serialize } from "~/serialization";
import { refCurrency } from "~/config";
import { Page } from "./page";
import { getAccountGroups } from "~/account-groups/data";
import { getAccounts } from "../data";
import { getLedgerRows, getBalance } from "./calculation.server";
import { today } from "~/today";
import { startOfMonth, subDays, subMonths } from "date-fns";
import { formatISODate } from "~/formatting";
import { redis } from "~/redis.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const from = new URL(request.url).searchParams.get("from");
  const fromDate = from ? new Date(from) : undefined;

  const to = new URL(request.url).searchParams.get("to");
  const toDate = to ? new Date(to) : undefined;

  if (!fromDate && !toDate) {
    return redirect(
      `?from=${formatISODate(startOfMonth(subMonths(today, 1)))}`,
    );
  }

  const [account, bookingsForPeriod, allAccounts, accountGroups] =
    await Promise.all([
      prisma.account.findUnique({
        where: { id: params.accountId },
        include: { group: { include: {} } },
      }),
      prisma.booking.findMany({
        where: {
          accountId: params.accountId,
          AND: [
            ...(fromDate ? [{ date: { gte: fromDate } }] : []),
            ...(toDate ? [{ date: { lte: toDate } }] : []),
          ],
        },
        include: {
          transaction: {
            include: { bookings: true },
          },
        },
        orderBy: [{ date: "asc" }, { transaction: { createdAt: "asc" } }],
      }),
      getAccounts(),
      getAccountGroups(),
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

  let openingBalance: Prisma.Decimal | undefined = undefined;
  if (fromDate) {
    const openingBalanceDate = subDays(fromDate, 1);
    const openingBalanceString = fromDate
      ? await redis.get(
          `account:${account.id}:balance:${formatISODate(openingBalanceDate)}`,
        )
      : undefined;

    if (openingBalanceString) {
      openingBalance = new Prisma.Decimal(openingBalanceString);
    } else {
      openingBalance = await getBalance(
        await prisma.booking.findMany({
          where: {
            accountId: params.accountId,
            date: { lte: openingBalanceDate },
          },
        }),
        ledgerCurrency,
      );
      await redis.set(
        `account:${account.id}:balance:${formatISODate(openingBalanceDate)}`,
        openingBalance.toString(),
      );
    }
  }

  const ledgerRows = await getLedgerRows(
    bookingsForPeriod,
    ledgerCurrency,
    openingBalance,
  );

  return serialize({
    fromDate,
    toDate,
    ledgerCurrency,
    account: {
      ...account,
      path: getAccountPath(account),
    },
    openingBalance,
    ledgerRows: ledgerRows.reverse(),
    allAccounts: allAccounts
      .map((a) => ({
        ...a,
        path: getAccountPath(a),
      }))
      .toSorted((a, b) => a.path.localeCompare(b.path)),
  });
}

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function AccountLedger() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
