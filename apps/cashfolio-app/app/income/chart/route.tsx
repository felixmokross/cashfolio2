import { useNavigate, useRouteLoaderData } from "react-router";
import type { LoaderData as IncomeLoaderData } from "../route";
import invariant from "tiny-invariant";
import { AgCharts } from "ag-charts-react";
import { useAccountBook } from "~/account-books/hooks";
import { formatMoney } from "~/formatting";
import { Subheading } from "~/platform/heading";
import { AccountType, EquityAccountSubtype } from "~/.prisma-client/enums";
import { getTheme } from "~/theme";
import type { IncomeAccountsNode } from "../types";
import type { Serialize } from "~/serialization";

function isExpensesNode(node: Serialize<IncomeAccountsNode>): boolean {
  return node.nodeType === "accountGroup"
    ? node.children.every(isExpensesNode)
    : node.type === AccountType.EQUITY &&
        node.equityAccountSubtype === EquityAccountSubtype.EXPENSE;
}

export default function Route() {
  const loaderData = useRouteLoaderData<IncomeLoaderData>("income/route");
  invariant("children" in loaderData!.rootNode, "Root node must have children");
  const navigate = useNavigate();
  const accountBook = useAccountBook();
  const isExpensesGroup = isExpensesNode(loaderData!.rootNode);
  const nodes = isExpensesGroup
    ? loaderData!.rootNode.children
        .map((n) => ({
          ...n,
          value: -n.value,
        }))
        .toReversed()
    : loaderData!.rootNode.children;
  return (
    <>
      <AgCharts
        className="h-[calc(100vh_-_15rem)] mt-12"
        options={{
          background: {
            visible: false,
          },
          theme: {
            params: {
              fontFamily:
                '"Inter", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
              fontSize: 14,
              textColor:
                getTheme() === "dark"
                  ? "oklch(98.5% 0 0)"
                  : "oklch(14.1% 0.005 285.823)",
            },
          },
          series: nodes.map((n) => ({
            type: "bar",
            direction: "horizontal",
            xKey: "period",
            yKey: n.id,
            yName: n.name,
            listeners: {
              seriesNodeDoubleClick: (e) => {
                const node = nodes.find((node) => node.id === e.yKey);
                invariant(node, "Node must be found");

                if (node.nodeType === "accountGroup") {
                  navigate(`/${accountBook.id}/income/chart/${node.id}`);
                } else {
                  navigate(`/${accountBook.id}/accounts/${node.id}`);
                }
              },
            },
          })),
          formatter: {
            x: (params) => formatMoney(params.value as number),
          },
          axes: [
            {
              type: "number",
              position: "bottom",
            },
            {
              type: "category",
              position: "left",
              line: { enabled: false },
              label: { enabled: false },
            },
          ],
          legend: {
            position: "right",
          },
          data: [
            {
              period: "Current Period",
              ...Object.fromEntries(nodes.map((n) => [n.id, n.value])),
            },
          ],
        }}
      />
      <Subheading className="text-center mt-4">
        Total: {formatMoney(loaderData!.rootNode.value)}
      </Subheading>
    </>
  );
}
