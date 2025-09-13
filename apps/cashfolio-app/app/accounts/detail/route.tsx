import { type Account } from "@prisma/client";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { getAccountGroupPath } from "~/utils";
import { serialize } from "~/serialization";
import { refCurrency } from "~/config";
import { Page } from "./page";
import { getAccountGroups } from "~/account-groups/data";
import { getAccounts } from "../data";
import { getLedgerRows } from "./calculation.server";

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

  return serialize({
    ledgerCurrency,
    account: {
      ...account,
      path: getAccountPath(account),
    },
    ledgerRows: (await getLedgerRows(bookings, ledgerCurrency)).reverse(),
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
