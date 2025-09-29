import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/balances/page";
import { serialize } from "~/serialization";
import { getBalanceSheet } from "./calculation.server";
import { getAccounts } from "~/accounts/data";
import { getAccountGroups } from "~/account-groups/data";
import { getPeriodDateRange } from "~/period/functions";

export async function loader({ request }: LoaderFunctionArgs) {
  const { to: date } = await getPeriodDateRange(request);

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(),
    getAccountGroups(),
  ]);

  return serialize({
    balanceSheet: {
      ...(await getBalanceSheet(accounts, accountGroups, date)),
    },
  });
}

export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
