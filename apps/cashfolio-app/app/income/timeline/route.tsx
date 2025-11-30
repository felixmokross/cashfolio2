import {
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { ensureAuthorizedForUserAndAccountBookId } from "~/account-books/functions.server";
import { defaultShouldRevalidate } from "~/revalidation";
import { serialize, type Serialize } from "~/serialization";
import { getIncomeStatement } from "../calculation.server";
import { getPeriodDateRangeFromPeriod } from "~/period/functions";
import { AgCharts } from "ag-charts-react";
import { getTheme } from "~/theme";
import { formatMoney } from "~/formatting";
import { format, getQuarter, getYear, parseISO } from "date-fns";
import { decrementPeriod } from "~/period/functions";
import type { IncomeAccountsNode } from "../types";
import { findSubtreeRootNode, isExpensesNode } from "../functions";
import { sum } from "~/utils.server";
import { defaultChartOptions, defaultChartTheme } from "~/platform/charts";
import {
  getInitialTimelinePeriod,
  parseRange,
  TimelineSelector,
} from "~/period/timeline";
import {
  getNumberOfPeriods,
  redirectToLastUsedTimelineRange,
} from "~/period/timeline.server";
import { ensureUser } from "~/users/functions.server";
import invariant from "tiny-invariant";
import type { TimelineView } from "~/period/types";
import type {
  AgBarSeriesOptions,
  AgLineSeriesOptions,
} from "ag-charts-community";
import { useAccountBook } from "~/account-books/hooks";
import { getMinBookingDate } from "~/transactions/functions.server";
import { mergeById } from "~/utils";
import type { AccountGroupNode } from "~/account-groups/accounts-tree";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await ensureUser(request);

  invariant(params.view, "view param not found");
  invariant(params.accountBookId, "accountBookId not found");
  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    params.accountBookId,
  );

  if (!params.range) {
    throw await redirectToLastUsedTimelineRange(user, link, "totals");
  }

  const range = parseRange(params.range);
  const period = getInitialTimelinePeriod(range);
  const n = await getNumberOfPeriods(link.accountBookId, range);

  const periods = new Array(n).fill(null);

  periods[0] = period;
  for (let i = 1; i < n; i++) {
    periods[i] = decrementPeriod(periods[i - 1]);
  }

  const periodDateRanges = periods
    .map((p) => getPeriodDateRangeFromPeriod(p))
    .toReversed();

  const timeline = (
    await Promise.all(
      periodDateRanges.map(async (dr) => {
        const incomeStatement = await getIncomeStatement(
          link.accountBookId,
          dr.from,
          dr.to,
        );

        let rootNode: IncomeAccountsNode | undefined;
        if (params.nodeId) {
          const subtreeRootNode = findSubtreeRootNode(
            incomeStatement,
            params.nodeId,
          );
          rootNode = subtreeRootNode as IncomeAccountsNode;
        } else {
          rootNode = incomeStatement;
        }

        return {
          periodDateRange: dr,
          node: rootNode,
        };
      }),
    )
  ).filter((item) => !!item.node);

  return serialize({
    view: params.view as TimelineView,
    period,
    rangeSpecifier: params.range,
    range,
    timeline,
    minBookingDate: await getMinBookingDate(link.accountBookId),
    average: sum(timeline.map((i) => i.node?.value ?? 0)).dividedBy(
      timeline.length,
    ),
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export default function Route() {
  const {
    view,
    average,
    timeline,
    period,
    range,
    rangeSpecifier,
    minBookingDate,
  } = useLoaderData<typeof loader>();

  const { referenceCurrency } = useAccountBook();

  invariant(timeline[0].node.nodeType === "accountGroup", "Invalid node type");

  const navigate = useNavigate();
  const isExpensesGroup = timeline[0].node && isExpensesNode(timeline[0].node);
  const negativeFillColor =
    getTheme() === "dark"
      ? "oklch(57.7% 0.245 27.325)"
      : "oklch(50.5% 0.213 27.518)";
  const positiveFillColor =
    getTheme() === "dark"
      ? "oklch(62.7% 0.194 149.214)"
      : "oklch(52.7% 0.154 150.069)";

  const neutralFillColor =
    getTheme() === "dark"
      ? "oklch(87.1% 0.006 286.286)"
      : "oklch(55.2% 0.016 285.938)";
  const neutralStrokeColor =
    getTheme() === "dark"
      ? "oklch(96.7% 0.001 286.375)"
      : "oklch(14.1% 0.005 285.823)";

  const tooltipOptions =
    period.granularity === "quarter"
      ? {
          renderer: (params: any) => ({
            heading: format(params.datum.date, "QQQ yyyy"),
          }),
        }
      : undefined;
  return (
    <>
      <TimelineSelector
        className="mt-12"
        period={period}
        rangeSpecifier={rangeSpecifier}
        range={range}
        view={view}
        minBookingDate={minBookingDate}
      />
      <AgCharts
        key={view}
        className="h-[calc(100vh_-_16rem)] mt-4"
        options={{
          ...defaultChartOptions,
          title:
            view === "breakdown" && timeline.length === 1
              ? {
                  text: `Total: ${referenceCurrency} ${formatMoney(isExpensesGroup ? -timeline[0].node.value : timeline[0].node.value)}`,
                }
              : undefined,
          theme:
            view === "totals"
              ? {
                  ...defaultChartTheme,
                  palette: {
                    fills: [neutralFillColor],
                  },
                }
              : defaultChartTheme,
          series: [
            ...(view === "totals"
              ? [
                  {
                    type: "bar",
                    xKey: "date",
                    yKey: "total",
                    yName: "Total",
                    tooltip: tooltipOptions,
                    itemStyler: (params) => {
                      return {
                        fill:
                          isExpensesGroup || params.yValue < 0
                            ? negativeFillColor
                            : positiveFillColor,
                      };
                    },
                  } as AgBarSeriesOptions,
                ]
              : mergeById(
                  ...timeline.map(
                    (i) =>
                      (
                        i.node as Serialize<
                          IncomeAccountsNode & AccountGroupNode
                        >
                      ).children,
                  ),
                )
                  .filter((c) =>
                    timeline.some((t) =>
                      (t.node.nodeType === "accountGroup"
                        ? t.node.children
                        : []
                      )
                        .map((tc) => tc.id)
                        .includes(c.id),
                    ),
                  )
                  .toSorted((a, b) => {
                    const parentNode = timeline[timeline.length - 1].node;
                    if (parentNode.nodeType !== "accountGroup") {
                      return Infinity;
                    }

                    const childNodeA = parentNode.children.find(
                      (c) => c.id === a.id,
                    );
                    const childNodeB = parentNode.children.find(
                      (c) => c.id === b.id,
                    );
                    const sortOrder =
                      (childNodeA?.value ?? Infinity) -
                      (childNodeB?.value ?? Infinity);

                    return isExpensesGroup ? sortOrder : -sortOrder;
                  })
                  .map(
                    (childNode) =>
                      ({
                        type: "bar",
                        xKey: "date",
                        yKey: childNode.id,
                        yName: childNode.name,
                        tooltip: tooltipOptions,
                      }) as AgBarSeriesOptions,
                  )),
            ...(view === "totals"
              ? [
                  {
                    type: "line",
                    xKey: "date",
                    yKey: "average",
                    yName: "Average",
                    marker: { enabled: false },
                    stroke: neutralStrokeColor,
                    lineDash: [6, 4],
                    tooltip: tooltipOptions,
                  } as AgLineSeriesOptions,
                ]
              : []),
          ],
          tooltip: {
            mode: "single",
          },
          formatter: {
            y: (params) => formatMoney(params.value as number),
          },
          listeners: {
            seriesNodeDoubleClick: (event) => {
              const periodSpecifier =
                period.granularity === "year"
                  ? getYear(event.datum.date)
                  : period.granularity === "quarter"
                    ? format(event.datum.date, "yyyy-QQQ").toLowerCase()
                    : format(event.datum.date, "yyyy-MM");
              if (view === "totals") {
                navigate(`../timeline/breakdown/${periodSpecifier}`);
                return;
              }

              // const node = event.datum.children.find(
              //   (c: any) => c.id === event.yKey,
              // );

              invariant(
                timeline[0].node.nodeType === "accountGroup",
                "Invalid node type",
              );

              const node = timeline[0].node.children.find(
                (c) => c.id === event.yKey,
              );

              invariant(node, "Node not found");

              if (node.nodeType === "accountGroup") {
                navigate(
                  `../../income/${event.yKey}/timeline/breakdown/${rangeSpecifier}`,
                );
              } else {
                navigate(`../../accounts/${event.yKey}/${periodSpecifier}`);
              }
            },
          },
          axes: [
            {
              type: "unit-time",
              position: "bottom",
              label:
                timeline.length === 1
                  ? {
                      formatter: () =>
                        period.granularity === "month"
                          ? "Month to Date"
                          : period.granularity === "quarter"
                            ? "Quarter to Date"
                            : "Year to Date",
                    }
                  : period.granularity === "quarter"
                    ? {
                        formatter: (params) => `Q${getQuarter(params.value)}`,
                      }
                    : undefined,
            },
            {
              type: "number",
              position: "left",
            },
          ],
          data: timeline
            .map((i) => ({
              date: parseISO(i.periodDateRange.from),
              average,
              total: i.node?.value ?? 0,
              ...Object.fromEntries(
                (i.node && i.node.nodeType === "accountGroup"
                  ? i.node.children
                  : []
                ).map((child) => [child.id, child.value]),
              ),
            }))
            .map(({ date, ...values }) => ({
              date,
              ...Object.fromEntries(
                Object.entries(values).map(([key, value]) => [
                  key,
                  isExpensesGroup ? -value : value,
                ]),
              ),
            })),
        }}
      />
    </>
  );
}
