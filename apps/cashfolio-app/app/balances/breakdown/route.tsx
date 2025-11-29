import {
  Outlet,
  redirect,
  useLoaderData,
  useMatch,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { ensureAuthorizedForUserAndAccountBookId } from "~/account-books/functions.server";
import { getBalanceSheet } from "../functions.server";
import { serialize } from "~/serialization";
import { defaultShouldRevalidate } from "~/revalidation";
import { endOfMonthUtc, endOfQuarterUtc, endOfYearUtc, today } from "~/dates";
import { isAfter, parseISO, subMonths } from "date-fns";
import { getViewPreference } from "~/view-preferences/functions.server";
import { ensureUser } from "~/users/functions.server";
import invariant from "tiny-invariant";
import {
  dateOrDateOptionKey,
  saveViewPreference,
} from "~/view-preferences/functions";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";
import { useEffect, useState } from "react";
import { useAccountBook } from "~/account-books/hooks";
import { formatISODate } from "~/formatting";
import { DateInput } from "~/platform/forms/date-input";
import { findSubtreeRootNode } from "~/income/functions";
import type { BalancesAccountsNode } from "../types";
import type { AccountGroupNode } from "~/account-groups/accounts-tree";

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
        : dateOption === "end-of-last-quarter"
          ? endOfQuarterUtc(subMonths(today(), 3))
          : dateOption === "end-of-last-year"
            ? endOfYearUtc(subMonths(today(), 12))
            : parseISO(params.dateOrDateOption);

  const balanceSheet = await getBalanceSheet(link.accountBookId, date);
  const node = params.nodeId
    ? findSubtreeRootNode(balanceSheet.assets, params.nodeId)
    : balanceSheet.assets;
  return serialize({
    balanceSheet,
    date,
    dateOption,
    node: node as (BalancesAccountsNode & AccountGroupNode) | undefined,
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const { date, dateOption } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const accountBook = useAccountBook();
  const [dateValue, setDateValue] = useState(date);

  const match = useMatch("/:_/balances/:_?/breakdown/:_/:viewType/:chartType?");

  useEffect(() => {
    setDateValue(date);
  }, [date]);

  return (
    <div className="space-y-4 mt-12">
      <div className="flex items-center justify-center gap-2">
        <Field>
          <Select
            value={dateOption}
            onChange={(e) => {
              const newDateOption = e.target.value;

              const dateOrDateOption =
                newDateOption === "date"
                  ? formatISODate(parseISO(date))
                  : newDateOption;

              navigate(`../breakdown/${dateOrDateOption}`);
              saveViewPreference(
                dateOrDateOptionKey(accountBook.id),
                dateOrDateOption,
              );
            }}
          >
            <option value="today">Today</option>
            <option value="end-of-last-month">End of Last Month</option>
            <option value="end-of-last-quarter">End of Last Quarter</option>
            <option value="end-of-last-year">End of Last Year</option>
            <option value="date">Select date…</option>
          </Select>
        </Field>
        <Field className="max-w-36 w-full">
          <DateInput
            value={formatISODate(parseISO(dateValue))}
            disabled={
              dateOption === "today" ||
              dateOption === "end-of-last-month" ||
              dateOption === "end-of-last-quarter" ||
              dateOption === "end-of-last-year"
            }
            onChange={(value) => {
              if (value) {
                const utcDate = value.toDate("UTC");
                setDateValue(value.toString());
                if (isAfter(utcDate, Date.UTC(1970, 0, 1))) {
                  const formattedDate = formatISODate(utcDate);
                  navigate(`../breakdown/${formattedDate}`);

                  saveViewPreference(
                    dateOrDateOptionKey(accountBook.id),
                    formattedDate,
                  );
                }
              }
            }}
          />
        </Field>

        <Field>
          <Select
            onChange={(e) => navigate(e.target.value)}
            value={match?.params.viewType}
          >
            <option value="chart">Chart</option>
            <option value="table">Table</option>
          </Select>
        </Field>
        {match?.params.viewType === "chart" && (
          <Field>
            <Select
              value={match?.params.chartType}
              onChange={(e) => {
                navigate(`./chart/${e.target.value}`);
              }}
            >
              <option value="assets">Assets</option>
              <option value="liabilities">Liabilities</option>
            </Select>
          </Field>
        )}
      </div>
      <Outlet />
    </div>
  );
}
