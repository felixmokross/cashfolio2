import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/breakdown/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { getPeriodDateRange } from "~/period/functions.server";
import { ensureAuthorized } from "~/account-books/functions.server";
import type { IncomeAccountsNode } from "../types";
import { getPageTitle } from "~/meta";
import { defaultShouldRevalidate } from "~/revalidation";
import { findSubtreeRootNode } from "../functions";
import type { Route } from "./+types/route";
import type { AccountGroupNode } from "~/account-groups/accounts-tree";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: getPageTitle(`Income / ${loaderData.rootNode.name}`) },
];

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

  const incomeStatementTree = await getIncomeStatement(
    accountBook,
    accounts,
    accountGroups,
    from,
    to,
  );

  let rootNode: IncomeAccountsNode;
  let siblings: IncomeAccountsNode[];
  if (params.nodeId) {
    const subtreeRootNode = findSubtreeRootNode(
      incomeStatementTree,
      params.nodeId,
    );
    if (!subtreeRootNode) {
      throw new Response("Not Found", { status: 404 });
    }
    rootNode = subtreeRootNode;
    siblings = (
      findSubtreeRootNode(
        incomeStatementTree,
        subtreeRootNode.nodeType === "account"
          ? subtreeRootNode.groupId
          : subtreeRootNode.parentGroupId!,
      ) as (IncomeAccountsNode & AccountGroupNode) | undefined
    )?.children.filter((s) => s.nodeType === "accountGroup") ?? [rootNode];
  } else {
    rootNode = incomeStatementTree;
    siblings = [rootNode];
  }

  return serialize({ rootNode, siblings });
}

export const shouldRevalidate = defaultShouldRevalidate;

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
