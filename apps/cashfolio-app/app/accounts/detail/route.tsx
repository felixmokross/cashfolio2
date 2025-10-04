import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { getAccountGroupPath } from "~/utils";
import { serialize } from "~/serialization";
import { refCurrency } from "~/config";
import { Page } from "./page";
import { getAccountGroups } from "~/account-groups/data";
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
import { ensureAuthenticated } from "~/auth/functions.server";
import type { Account } from "~/.prisma-client/client";
import {
  AccountType,
  EquityAccountSubtype,
  Unit as UnitEnum,
} from "~/.prisma-client/enums";
import invariant from "tiny-invariant";

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

  const { from, to } = await getPeriodDateRange(request);

  if (!params.accountId) {
    throw new Response("Not Found", { status: 400 });
  }

  const [account, bookingsForPeriod, allAccounts, accountGroups] =
    await Promise.all([
      getAccount(params.accountId, params.accountBookId),
      getBookings(params.accountId, params.accountBookId, from, to),
      getAccounts(params.accountBookId),
      getAccountGroups(params.accountBookId),
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
    from && account.type !== AccountType.EQUITY
      ? await getBalanceCached(account.id, ledgerUnit, subDays(from, 1))
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
  });
}

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function AccountLedger() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
