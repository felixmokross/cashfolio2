import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/balances/page";
import { serialize } from "~/serialization";
import { getBalanceSheet } from "./calculation.server";
import { getAccounts } from "~/accounts/data";
import { getAccountGroups } from "~/account-groups/data";
import { getPeriodDateRange } from "~/period/functions";
import { prisma } from "~/prisma.server";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const { to: date } = await getPeriodDateRange(request, link.accountBookId);

  const [accountBook, accounts, accountGroups] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({
      where: { id: link.accountBookId },
    }),
    getAccounts(link.accountBookId),
    getAccountGroups(link.accountBookId),
  ]);

  return serialize({
    balanceSheet: {
      ...(await getBalanceSheet(accountBook, accounts, accountGroups, date)),
    },
  });
}

export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
