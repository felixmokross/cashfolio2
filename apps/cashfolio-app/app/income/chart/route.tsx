import { useNavigate, useRouteLoaderData } from "react-router";
import type { LoaderData as IncomeLoaderData } from "../route";
import invariant from "tiny-invariant";
import { AgCharts } from "ag-charts-react";
import { useAccountBook } from "~/account-books/hooks";
import { formatMoney } from "~/formatting";
import { Subheading } from "~/platform/heading";
import { AccountType, EquityAccountSubtype } from "~/.prisma-client/enums";
import { getTheme } from "~/theme";

export default function Route() {
  const loaderData = useRouteLoaderData<IncomeLoaderData>("income/route");
  invariant("children" in loaderData!.rootNode, "Root node must have children");
  const navigate = useNavigate();
  const accountBook = useAccountBook();
  const isExpensesGroup =
    loaderData!.rootNode.nodeType === "accountGroup" &&
    loaderData!.rootNode.children.every(
      (c) =>
        c.nodeType === "account" &&
        c.type === AccountType.EQUITY &&
        c.equityAccountSubtype === EquityAccountSubtype.EXPENSE,
    );
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
          series: [
            {
              type: "bar",
              direction: "horizontal",
              xKey: "name",
              yKey: "value",
              itemStyler: (params) => {
                return {
                  fill:
                    isExpensesGroup || params.yValue < 0
                      ? getTheme() === "dark"
                        ? "oklch(57.7% 0.245 27.325)"
                        : "oklch(50.5% 0.213 27.518)"
                      : getTheme() === "dark"
                        ? "oklch(62.7% 0.194 149.214)"
                        : "oklch(52.7% 0.154 150.069)",
                };
              },
              listeners: {
                seriesNodeClick: (e) => {
                  if (e.datum.nodeType === "accountGroup") {
                    navigate(`/${accountBook.id}/income/chart/${e.datum.id}`);
                  } else {
                    navigate(`/${accountBook.id}/accounts/${e.datum.id}`);
                  }
                },
              },
            },
          ],
          formatter: {
            x: (params) => formatMoney(params.value as number),
          },
          data: isExpensesGroup
            ? loaderData!.rootNode.children
                .map((n) => ({
                  ...n,
                  value: -n.value,
                }))
                .toReversed()
            : loaderData!.rootNode.children,
        }}
      />
      <Subheading className="text-center mt-4">
        Total: {formatMoney(loaderData!.rootNode.value)}
      </Subheading>
    </>
  );
}
