import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/breakdown/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { getPeriodDateRangeFromPeriod, parsePeriod } from "~/period/functions";
import { ensureAuthorizedForUserAndAccountBookId } from "~/account-books/functions.server";
import type { IncomeAccountsNode } from "../types";
import { defaultShouldRevalidate } from "~/revalidation";
import { findSubtreeRootNode } from "../functions";
import type { Route } from "./+types/route";
import type { AccountGroupNode } from "~/types";
import { ensureUser } from "~/users/functions.server";
import invariant from "tiny-invariant";
import { getViewPreference } from "~/view-preferences/functions.server";
import { periodOrPeriodSpecifierKey } from "~/view-preferences/functions";
import { getMinBookingDate } from "~/transactions/functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await ensureUser(request);

  invariant(params.accountBookId, "accountBookId param is required");
  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    params.accountBookId,
  );

  if (!params.periodOrPeriodSpecifier) {
    return redirect(
      `./${getViewPreference(user, periodOrPeriodSpecifierKey(link.accountBookId)) ?? "mtd"}`,
    );
  }

  const minBookingDate = await getMinBookingDate(link.accountBookId);
  const { period, periodSpecifier } = parsePeriod(
    params.periodOrPeriodSpecifier,
  );

  const { from, to } = getPeriodDateRangeFromPeriod(period);

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

  const incomeStatementTree = await getIncomeStatement(
    accountBook,
    accounts,
    accountGroups,
    from,
    to,
  );

  let rootNode: IncomeAccountsNode;
  if (params.nodeId) {
    const subtreeRootNode = findSubtreeRootNode(
      incomeStatementTree,
      params.nodeId,
    );
    if (!subtreeRootNode) {
      throw new Response("Not Found", { status: 404 });
    }
    rootNode = subtreeRootNode as IncomeAccountsNode & AccountGroupNode;
  } else {
    rootNode = incomeStatementTree;
  }

  return serialize({
    rootNode,
    period,
    periodSpecifier,
    minBookingDate,
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<typeof loader>();
  return <Page loaderData={loaderData} />;
}
