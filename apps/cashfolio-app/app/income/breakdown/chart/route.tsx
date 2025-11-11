import { useNavigate, useRouteLoaderData } from "react-router";
import type { LoaderData as IncomeLoaderData } from "../route";
import invariant from "tiny-invariant";
import { AgCharts } from "ag-charts-react";
import { useAccountBook } from "~/account-books/hooks";
import { formatMoney } from "~/formatting";
import { Subheading } from "~/platform/heading";
import { isExpensesNode } from "~/income/functions";
import { defaultChartOptions } from "~/platform/charts";

export default function Route() {
  const loaderData = useRouteLoaderData<IncomeLoaderData>(
    "income/breakdown/route",
  );
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
        className="h-[calc(100vh_-_19rem)] mt-4"
        options={{
          ...defaultChartOptions,
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
                  navigate(
                    `/${accountBook.id}/income/${node.id}/breakdown/chart`,
                  );
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
          legend: { position: "right" },
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
