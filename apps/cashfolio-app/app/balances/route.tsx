import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/balances/page";
import { serialize } from "~/serialization";
import { getBalanceSheet } from "./calculation.server";
import { getAccounts } from "~/accounts/data";
import { getAccountGroups } from "~/account-groups/data";
import { getPeriodDateRange } from "~/period/functions";
import { ensureAuthenticated } from "~/auth/functions.server";
import invariant from "tiny-invariant";
import { prisma } from "~/prisma.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(!!params.accountBookId, "accountBookId not found in params");

  const { to: date } = await getPeriodDateRange(request, params.accountBookId);

  const [accountBook, accounts, accountGroups] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({
      where: { id: params.accountBookId },
    }),
    getAccounts(params.accountBookId),
    getAccountGroups(params.accountBookId),
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
