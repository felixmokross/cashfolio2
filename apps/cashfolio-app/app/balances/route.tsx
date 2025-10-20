import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/balances/page";
import { serialize } from "~/serialization";
import { getBalanceSheet } from "./functions.server";
import { getPeriodDateRange } from "~/period/functions";
import { ensureAuthorized } from "~/account-books/functions.server";
import type { Route } from "./+types/route";
import { getPageTitle } from "~/meta";

export const meta: Route.MetaFunction = () => [
  { title: getPageTitle("Balances") },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const { to: date } = await getPeriodDateRange(request, link.accountBookId);

  return serialize({
    balanceSheet: await getBalanceSheet(link.accountBookId, date),
  });
}
export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
