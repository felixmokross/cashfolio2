import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/balances/page";
import { serialize } from "~/serialization";
import { subDays } from "date-fns";
import { today } from "~/dates";
import { getBalanceSheet } from "./calculation.server";
import { getAccounts } from "~/accounts/data";
import { getAccountGroups } from "~/account-groups/data";

export async function loader({ request }: LoaderFunctionArgs) {
  const dateString = new URL(request.url).searchParams.get("date");
  // TODO use today if FX rates are available for today
  const date = dateString ? new Date(dateString) : subDays(today, 1);

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(),
    getAccountGroups(),
  ]);

  return serialize({
    date,
    balanceSheet: {
      ...(await getBalanceSheet(accounts, accountGroups, date)),
      // just for verification
      // equity: sum(
      //   Array.from(
      //     (
      //       await getProfitLossStatement(
      //         accounts,
      //         accountGroups,
      //         transactions,
      //         async (date, from, to) =>
      //           (await getExchangeRate(from, to, date))!,
      //         date,
      //       )
      //     ).valueByAccountId,
      //   ).map(([, value]) => value),
      // ),
    },
  });
}

export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
