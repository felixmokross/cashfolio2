import {
  AccountType,
  EquityAccountSubtype,
  Unit as UnitEnum,
  type Account,
} from "@prisma/client";
import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { getAccountGroupPath } from "~/utils";
import { serialize } from "~/serialization";
import { refCurrency } from "~/config";
import { Page } from "./page";
import { getAccountGroups } from "~/account-groups/data";
import { getAccounts } from "../data";
import { getLedgerRows, getBalanceCached } from "./calculation.server";
import { today } from "~/today";
import { startOfMonth, subDays, subMonths } from "date-fns";
import { formatISODate } from "~/formatting";
import type { Unit } from "~/fx";

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

  const ledgerUnit: Unit = account.unit
    ? account.unit === UnitEnum.CURRENCY
      ? { unit: UnitEnum.CURRENCY, currency: account.currency! }
      : account.unit === UnitEnum.CRYPTOCURRENCY
        ? {
            unit: UnitEnum.CRYPTOCURRENCY,
            cryptocurrency: account.cryptocurrency!,
          }
        : {
            unit: UnitEnum.SECURITY,
            symbol: account.symbol!,
            tradeCurrency: account.tradeCurrency!,
          }
    : { unit: UnitEnum.CURRENCY, currency: refCurrency };

  const openingBalance =
    fromDate && account.type !== AccountType.EQUITY
      ? await getBalanceCached(account.id, ledgerUnit, subDays(fromDate, 1))
      : undefined;

  const ledgerRows = await getLedgerRows(
    bookingsForPeriod,
    ledgerUnit,
    openingBalance,
  );

  return serialize({
    fromDate,
    toDate,
    ledgerUnit,
    account: {
      ...account,
      path: getAccountPath(account),
    },
    openingBalance:
      account.type === AccountType.LIABILITY
        ? openingBalance?.neg()
        : openingBalance,
    ledgerRows: ledgerRows
      .map((lr) =>
        account.type === AccountType.LIABILITY ||
        (account.type === AccountType.EQUITY &&
          account.equityAccountSubtype === EquityAccountSubtype.EXPENSE)
          ? {
              ...lr,
              balance: lr.balance.neg(),
              valueInLedgerUnit: lr.valueInLedgerUnit.neg(),
              booking: {
                ...lr.booking,
                value: lr.booking.value.neg(),
              },
            }
          : lr,
      )
      .reverse(),
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
