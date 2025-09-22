import { subMonths } from "date-fns";
import { useLoaderData } from "react-router";
import { Page } from "~/income/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { endOfMonthUtc, startOfMonthUtc, today } from "~/dates";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";

export async function loader() {
  // TODO use today if FX rates are available for today
  const startDate = startOfMonthUtc(subMonths(today, 1));
  const endDate = endOfMonthUtc(subMonths(today, 1));

  const [accounts, transactions, accountGroups] = await Promise.all([
    prisma.account.findMany({
      orderBy: { name: "asc" },
      include: {
        bookings: {
          orderBy: { date: "asc" },
          where: { date: { gte: startDate, lte: endDate } },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        // this ensures a transaction is always considered in the period into which the last booking falls
        AND: [
          // at least one booking within the period
          { bookings: { some: { date: { gte: startDate, lte: endDate } } } },

          // no booking after the end of the period
          { bookings: { none: { date: { gt: endDate } } } },
        ],
      },
      include: {
        bookings: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: "asc" },
        },
      },
    }),
    getAccountGroups(),
  ]);

  return serialize({
    rootNode: await getIncomeStatement(
      accounts,
      accountGroups,
      transactions,
      startDate,
      endDate,
    ),
  });
}
export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
