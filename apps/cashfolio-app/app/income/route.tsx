import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { getPeriodDateRange } from "~/period/functions";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const { from, to } = await getPeriodDateRange(request, link.accountBookId);

  const [accountBook, accounts, accountGroups] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({
      where: { id: link.accountBookId },
    }),
    prisma.account.findMany({
      where: { accountBookId: link.accountBookId },
      orderBy: { name: "asc" },
      include: {
        bookings: {
          orderBy: { date: "asc" },
          where: { date: { gte: from, lte: to } },
        },
      },
    }),
    getAccountGroups(link.accountBookId),
  ]);

  return serialize({
    rootNode: await getIncomeStatement(
      accountBook,
      accounts,
      accountGroups,
      from,
      to,
    ),
  });
}
export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
