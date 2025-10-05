import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { serialize } from "~/serialization";
import { Page } from "./page";
import { getAccountGroupsWithPath } from "~/account-groups/data";
import { getAccounts } from "../data";
import {
  getLedgerRows,
  getBalanceCached,
  getAccount,
  getBookings,
} from "./calculation.server";
import { subDays } from "date-fns";
import type { Unit } from "~/fx";
import { getPeriodDateRange } from "~/period/functions";
import type { Account } from "~/.prisma-client/client";
import {
  AccountType,
  EquityAccountSubtype,
  Unit as UnitEnum,
} from "~/.prisma-client/enums";
import { prisma } from "~/prisma.server";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const { from, to } = await getPeriodDateRange(request, link.accountBookId);

  if (!params.accountId) {
    throw new Response("Not Found", { status: 400 });
  }

  const accountBook = await prisma.accountBook.findUniqueOrThrow({
    where: { id: link.accountBookId },
  });

  const [account, bookingsForPeriod, allAccounts, accountGroups] =
    await Promise.all([
      getAccount(params.accountId, link.accountBookId),
      getBookings(params.accountId, accountBook, from, to),
      getAccounts(link.accountBookId),
      getAccountGroupsWithPath(link.accountBookId),
    ]);
  if (!account) {
    throw new Response("Not Found", { status: 404 });
  }

  function getAccountPath(account: Account) {
    const accountGroupPath = accountGroups.find(
      (ag) => ag.id === account.groupId,
    )?.path;
    return `${accountGroupPath} / ${account.name}`;
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
    : {
        unit: UnitEnum.CURRENCY,
        currency: accountBook.referenceCurrency,
      };

  const openingBalance =
    from && account.type !== AccountType.EQUITY
      ? await getBalanceCached(
          accountBook.id,
          account.id,
          ledgerUnit,
          subDays(from, 1),
        )
      : undefined;

  const ledgerRows = await getLedgerRows(
    bookingsForPeriod,
    ledgerUnit,
    openingBalance,
  );

  return serialize({
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
          account.equityAccountSubtype !== EquityAccountSubtype.EXPENSE)
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
    accountGroups,
  });
}

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function AccountLedger() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
