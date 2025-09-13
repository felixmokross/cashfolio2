import { AccountType, AccountUnit, Prisma, type Account } from "@prisma/client";
import { subDays } from "date-fns";
import { useLoaderData } from "react-router";
import { ProfitLossStatementPage } from "~/components/profit-loss-statement-page";
import { refCurrency } from "~/config";
import { getExchangeRate } from "~/fx.server";
import {
  getAccountsTree as getAccountsTree,
  getProfitLossStatement,
} from "~/model";
import { prisma } from "~/prisma.server";
import { serialize } from "~/serialization";
import { today } from "~/today";
import type { AccountsNode } from "~/types";
import { sum } from "~/utils";

export async function loader() {
  // this date marks the end of what can be considered
  // bookings greater than this date should be filtered out for correct balances
  const endDate = subDays(today, 1);
  const [accounts, transactions, accountGroups] = await Promise.all([
    prisma.account.findMany({
      orderBy: { name: "asc" },
      include: { bookings: { orderBy: { date: "asc" } } },
    }),
    prisma.transaction.findMany({
      include: { bookings: { orderBy: { date: "asc" } } },
    }),
    prisma.accountGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  const profitLossStatement = await getProfitLossStatement(
    accounts,
    accountGroups,
    transactions,
    async (date, from, to) => (await getExchangeRate(from, to, date))!,
    endDate,
  );

  const equityRootNode = getAccountsTree(
    (accounts as Account[]).concat(profitLossStatement.virtualAccounts),
    accountGroups.concat(profitLossStatement.virtualAccountGroups),
  ).EQUITY;
  if (!equityRootNode) {
    throw new Error("No equity account group found");
  }

  function withProfitLoss(node: AccountsNode): ProfitLossAccountsNode {
    const children = node.children.map(withProfitLoss);
    return {
      ...node,
      value:
        node.nodeType === "account"
          ? (profitLossStatement.valueByAccountId.get(node.id) ??
            new Prisma.Decimal(0))
          : sum(children.map((c) => c.value)),
      children,
    };
  }

  return serialize({
    rootNode: withProfitLoss(equityRootNode),
  });
}

export type ProfitLossAccountsNode = Omit<AccountsNode, "children"> & {
  value: Prisma.Decimal;
  children: ProfitLossAccountsNode[];
};

export type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function ProfitLossStatement() {
  const loaderData = useLoaderData<LoaderData>();
  return <ProfitLossStatementPage loaderData={loaderData} />;
}
