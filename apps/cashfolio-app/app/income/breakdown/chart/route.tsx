import { useNavigate, useRouteLoaderData } from "react-router";
import type { LoaderData as IncomeLoaderData } from "../route";
import invariant from "tiny-invariant";
import { AgCharts } from "ag-charts-react";
import { useAccountBook } from "~/account-books/hooks";
import { formatMoney } from "~/formatting";
import { Subheading } from "~/platform/heading";
import { getTheme } from "~/theme";
import { isExpensesNode } from "~/income/functions";
import { Button } from "~/platform/button";
import { Select } from "~/platform/forms/select";

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
      <div className="mt-8 flex items-center gap-4">
        {loaderData!.rootNode.parentGroupId && (
          <Button
            hierarchy="secondary"
            href={`../chart/${loaderData!.rootNode.parentGroupId}`}
          >
            Back
          </Button>
        )}
        <Select
          value={loaderData!.rootNode.id}
          disabled={loaderData!.siblings.length <= 1}
          onChange={(e) => {
            navigate(
              `/${accountBook.id}/income/breakdown/chart/${e.target.value}`,
            );
          }}
        >
          {loaderData?.siblings.map((sibling) => (
            <option key={sibling.id} value={sibling.id}>
              {sibling.name}
            </option>
          ))}
        </Select>
      </div>
      <AgCharts
        className="h-[calc(100vh_-_18rem)] mt-2"
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
                  navigate(
                    `/${accountBook.id}/income/breakdown/chart/${node.id}`,
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
