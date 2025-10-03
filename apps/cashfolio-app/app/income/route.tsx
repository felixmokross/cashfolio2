import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { getPeriodDateRange } from "~/period/functions";
import { ensureAuthenticated } from "~/auth/functions.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);

  const { from, to } = await getPeriodDateRange(request);

  const [accounts, accountGroups] = await Promise.all([
    prisma.account.findMany({
      orderBy: { name: "asc" },
      include: {
        bookings: {
          orderBy: { date: "asc" },
          where: { date: { gte: from, lte: to } },
        },
      },
    }),
    getAccountGroups(),
  ]);

  return serialize({
    rootNode: await getIncomeStatement(accounts, accountGroups, from, to),
  });
}
export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
