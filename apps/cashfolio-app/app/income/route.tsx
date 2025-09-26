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
    const lastMonth = subMonths(today(), 1);
    return redirect(
      `?from=${formatISODate(startOfMonthUtc(lastMonth))}&to=${formatISODate(
        endOfMonthUtc(lastMonth),
      )}`,
    );
  }

  const [accounts, accountGroups] = await Promise.all([
    prisma.account.findMany({
      orderBy: { name: "asc" },
      include: {
        bookings: {
          orderBy: { date: "asc" },
          where: { date: { gte: fromDate, lte: toDate } },
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
