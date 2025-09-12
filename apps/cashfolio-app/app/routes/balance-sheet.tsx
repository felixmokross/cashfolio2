import { Prisma } from "@prisma/client";
import { useLoaderData } from "react-router";
import { BalanceSheetPage } from "~/components/balance-sheet-page";
import { prisma } from "~/prisma.server";
import { serialize } from "~/serialization";
import type { AccountsNode } from "~/types";
import { getExchangeRate } from "~/fx.server";
import {
  completeFxTransaction,
  generateFxBookingsForFxAccount,
  getBalanceByDate,
  getProfitLossStatement,
} from "~/model";
import { max, subDays } from "date-fns";
import { refCurrency } from "~/config";
import { today } from "~/today";

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
        ? (await getExchangeRate(node.currency!, refCurrency, endDate))!.mul(
            node.balanceInOriginalCurrency,
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
      profitAndLoss: Array.from(
        await getProfitLossStatement(
          accounts,
          transactions,
          async (date, from, to) => (await getExchangeRate(from, to, date))!,
          endDate,
        ),
      ),
      fxBookings: await Promise.all(
        accounts
          .filter(
            (a) =>
              (a.type === "ASSET" || a.type === "LIABILITY") &&
              a.currency !== refCurrency,
          )
          .map(
            async (a) =>
              await generateFxBookingsForFxAccount(
                a,
                async (date, from, to) =>
                  (await getExchangeRate(from, to, date))!,
                endDate,
              ),
          ),
      ),
      fxTransferBookings: await Promise.all(
        transactions.map(async (t) => ({
          id: `fx-transfer-${t.id}`,
          date: max(t.bookings.map((b) => b.date)),
          currency: refCurrency,
          value: await completeFxTransaction(
            t,
            async (date, from, to) => (await getExchangeRate(from, to, date))!,
          ),
        })),
      ),
      balanceByDate: accounts.map((a) => [
        a.id,
        Array.from(getBalanceByDate(a)),
      ]),
    },
  });
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Route() {
  const { balanceSheet } = useLoaderData<LoaderData>();
  return <BalanceSheetPage loaderData={{ balanceSheet }} />;
}
