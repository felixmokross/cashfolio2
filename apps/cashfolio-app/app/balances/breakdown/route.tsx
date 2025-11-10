import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/balances/breakdown/page";
import type { Route } from "./+types/route";
import { ensureAuthorizedForUserAndAccountBookId } from "~/account-books/functions.server";
import { getBalanceSheet } from "../functions.server";
import { serialize } from "~/serialization";
import { defaultShouldRevalidate } from "~/revalidation";
import { endOfMonthUtc, today } from "~/dates";
import { subMonths } from "date-fns";
import { getViewPreference } from "~/view-preferences/functions.server";
import { ensureUser } from "~/users/functions.server";
import invariant from "tiny-invariant";
import { dateOrDateOptionKey } from "~/view-preferences/functions";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await ensureUser(request);

  invariant(params.accountBookId, "accountBookId not found");
  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    params.accountBookId,
  );

  if (!params.dateOrDateOption) {
    const dateOrDateOption =
      getViewPreference(user, dateOrDateOptionKey(link.accountBookId)) ??
      "today";
    return redirect(`./${dateOrDateOption}`);
  }

  const dateOption = DATE_REGEX.test(params.dateOrDateOption)
    ? "date"
    : params.dateOrDateOption;

  const date =
    dateOption === "today"
      ? today()
      : dateOption === "end-of-last-month"
        ? endOfMonthUtc(subMonths(today(), 1))
        : new Date(params.dateOrDateOption);

  const balanceSheet = await getBalanceSheet(link.accountBookId, date);
  return serialize({
    balanceSheet,
    date,
    dateOption,
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<typeof loader>();

  return <Page loaderData={loaderData} />;
}
