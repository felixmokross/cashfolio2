import { AccountType, Prisma } from "@prisma/client";
import { useLoaderData } from "react-router";
import { BalanceSheetPage } from "~/components/balance-sheet-page";
import { prisma } from "~/prisma.server";
import { serialize } from "~/serialization";
import type { AccountsNode } from "~/types";
import { convertToRefCurrency } from "~/fx.server";

export async function loader() {
  const [accounts, accountGroups] = await Promise.all([
    prisma.account.findMany({
      orderBy: { name: "asc" },
      include: { bookings: true },
    }),
    prisma.accountGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  // TODO reuse from Accounts page
  const childrenByParentId: Record<string, AccountsNode[]> = {};
  for (const g of accountGroups) {
    if (!g.parentGroupId) continue;
    if (!childrenByParentId[g.parentGroupId]) {
      childrenByParentId[g.parentGroupId] = [];
    }
    childrenByParentId[g.parentGroupId].push({
      ...g,
      nodeType: "accountGroup",
      balance: new Prisma.Decimal(0),
      children: [],
    });
  }

  for (const a of accounts) {
    if (!childrenByParentId[a.groupId]) {
      childrenByParentId[a.groupId] = [];
    }
    childrenByParentId[a.groupId].push({
      ...a,
      nodeType: "account",
      balance: new Prisma.Decimal(0),
      balanceInOriginalCurrency: a.bookings
        .map((b) => b.value)
        .reduce((prev, curr) => prev.plus(curr), new Prisma.Decimal(0)),
      children: [],
    });
  }

  async function getRootNode(type: "ASSET" | "LIABILITY") {
    const rootGroup = accountGroups.find(
      (g) => !g.parentGroupId && g.type === type,
    );
    if (!rootGroup) throw new Error(`Root group of type ${type} not found!`);
    return await getNodeWithChildren({
      ...rootGroup,
      nodeType: "accountGroup",
      balance: new Prisma.Decimal(0),
      children: [],
    });
  }

  async function getNodeWithChildren(
    node: AccountsNode,
  ): Promise<AccountsNode> {
    const children =
      node.nodeType === "accountGroup" && childrenByParentId[node.id]
        ? await Promise.all(
            childrenByParentId[node.id].map(getNodeWithChildren),
          )
        : [];

    const balance =
      node.nodeType === "account"
        ? await convertToRefCurrency(
            node.balanceInOriginalCurrency,
            node.currency!,
          )
        : children
            .map((c) => c.balance)
            .reduce((prev, curr) => prev.plus(curr), new Prisma.Decimal(0));
    return {
      ...node,
      children,
      balance,
    };
  }

  const [assets, liabilities] = await Promise.all([
    getRootNode("ASSET"),
    getRootNode("LIABILITY"),
  ]);
  return serialize({
    balanceSheet: {
      assets,
      liabilities,
      netWorth: assets.balance.plus(liabilities.balance),
      profitAndLoss: (
        await Promise.all(
          accounts
            .filter((a) => (["EQUITY"] as AccountType[]).includes(a.type))
            .flatMap((a) =>
              a.bookings.map((b) => convertToRefCurrency(b.value, b.currency)),
            ),
        )
      )
        .reduce((prev, curr) => prev.plus(curr), new Prisma.Decimal(0))
        .negated(),
    },
  });
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const { balanceSheet } = useLoaderData<LoaderData>();
  return <BalanceSheetPage loaderData={{ balanceSheet }} />;
}
