import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page } from "~/income/page";
import { getIncomeStatement } from "~/income/calculation.server";
import { serialize } from "~/serialization";
import { getAccountGroups } from "~/account-groups/data";
import { prisma } from "~/prisma.server";
import { getPeriodDateRange } from "~/period/functions";
import { ensureAuthorized } from "~/account-books/functions.server";
import type { AccountsNode } from "~/account-groups/accounts-tree";
import type { IncomeAccountsNode } from "./types";
import type { Route } from "./+types/route";
import { getPageTitle } from "~/meta";
import { defaultShouldRevalidate } from "~/revalidation";

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
  if (params.nodeId) {
    const subtreeRootNode = findSubtreeRootNode(
      incomeStatementTree,
      params.nodeId,
    );
    if (!subtreeRootNode) {
      throw new Response("Not Found", { status: 404 });
    }
    rootNode = subtreeRootNode;
  } else {
    rootNode = incomeStatementTree;
  }

  return serialize({ rootNode });
}

export const shouldRevalidate = defaultShouldRevalidate;

function findSubtreeRootNode<T extends AccountsNode>(
  node: T,
  nodeId: string,
): T | undefined {
  if (node.id === nodeId) {
    return node;
  }

  if (node.nodeType === "accountGroup") {
    for (const child of node.children) {
      const result = findSubtreeRootNode(child as T, nodeId);
      if (result) {
        return result;
      }
    }
  }
}

export type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Route() {
  const loaderData = useLoaderData<LoaderData>();
  return <Page loaderData={loaderData} />;
}
