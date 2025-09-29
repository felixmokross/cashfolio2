import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { getSession } from "~/sessions.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const from = session.get("from");
  const fromDate = from ? new Date(from) : undefined;

  const to = session.get("to");
  const toDate = to ? new Date(to) : undefined;

  if (!fromDate || !toDate) {
    throw new Error("Invalid date range");
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
