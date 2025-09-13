import { subDays } from "date-fns";
import { useLoaderData } from "react-router";
import { Page } from "~/income/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { today } from "~/today";
import { getAccountsWithBookings } from "~/accounts/data";
import { getTransactionsWithBookings } from "~/transactions/data";
import { getAccountGroups } from "~/account-groups/data";

export async function loader() {
  // TODO use today if FX rates are available for today
  const endDate = subDays(today, 1);

  const [accounts, transactions, accountGroups] = await Promise.all([
    getAccountsWithBookings(endDate),
    getTransactionsWithBookings(endDate),
    getAccountGroups(),
  ]);

  return serialize({
    rootNode: await getIncomeStatement(
      accounts,
      accountGroups,
      transactions,
      endDate,
    ),
  });
}
export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
