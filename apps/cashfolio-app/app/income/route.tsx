import { subMonths } from "date-fns";
import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { endOfMonthUtc, startOfMonthUtc, today } from "~/dates";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { formatISODate } from "~/formatting";

export async function loader({ request }: LoaderFunctionArgs) {
  const from = new URL(request.url).searchParams.get("from");
  const fromDate = from ? new Date(from) : undefined;

  const to = new URL(request.url).searchParams.get("to");
  const toDate = to ? new Date(to) : undefined;

  if (!fromDate || !toDate) {
    // TODO use today if FX rates are available for today
    return redirect(
      `?from=${formatISODate(startOfMonthUtc(subMonths(today, 1)))}&to=${formatISODate(
        endOfMonthUtc(subMonths(today, 1)),
      )}`,
    );
  }

  const [accounts, transactions, accountGroups] = await Promise.all([
    prisma.account.findMany({
      orderBy: { name: "asc" },
      include: {
        bookings: {
          orderBy: { date: "asc" },
          where: { date: { gte: fromDate, lte: toDate } },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        // this ensures a transaction is always considered in the period into which the last booking falls
        AND: [
          // at least one booking within the period
          { bookings: { some: { date: { gte: fromDate, lte: toDate } } } },

          // no booking after the end of the period
          { bookings: { none: { date: { gt: toDate } } } },

          // TODO how can we query for FX transactions only?
        ],
      },
      include: {
        bookings: {
          where: { date: { gte: fromDate, lte: toDate } },
          orderBy: { date: "asc" },
        },
      },
    }),
    getAccountGroups(),
  ]);

  return serialize({
    fromDate,
    toDate,
    rootNode: await getIncomeStatement(
      accounts,
      accountGroups,
      transactions,
      fromDate,
      toDate,
    ),
  });
}
export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
