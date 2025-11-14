import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorizedForUserAndAccountBookId } from "~/account-books/functions.server";
import { defaultShouldRevalidate } from "~/revalidation";
import { serialize } from "~/serialization";
import { getIncomeStatement } from "../calculation.server";
import { prisma } from "~/prisma.server";
import { getAccountGroups } from "~/account-groups/data";
import { getPeriodDateRangeFromPeriod } from "~/period/functions";
import { AgCharts } from "ag-charts-react";
import { getTheme } from "~/theme";
import { formatMoney } from "~/formatting";
import { format, getQuarter, parseISO } from "date-fns";
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

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await ensureUser(request);

  invariant(params.accountBookId, "accountBookId not found");
  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    params.accountBookId,
  );

  if (!params.range) throw await redirectToLastUsedTimelineRange(user, link);

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

  const [accountBook, accountGroups] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({
      where: { id: link.accountBookId },
    }),
    getAccountGroups(link.accountBookId),
  ]);

  const timeline = await Promise.all(
    periodDateRanges.map(async (dr) => {
      const accounts = await prisma.account.findMany({
        where: { accountBookId: link.accountBookId },
        orderBy: { name: "asc" },
        include: {
          bookings: {
            orderBy: { date: "asc" },
            where: {
              date: {
                gte: dr.from,
                lte: dr.to,
              },
            },
          },
        },
      });
      const incomeStatement = await getIncomeStatement(
        accountBook,
        accounts,
        accountGroups,
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
  );

  return serialize({
    period,
    range: params.range,
    timeline,
    average: sum(timeline.map((i) => i.node?.value ?? 0)).dividedBy(
      timeline.length,
    ),
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export default function Route() {
  const { timeline, average, period, range } = useLoaderData<typeof loader>();

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
      <TimelineSelector className="mt-12" period={period} range={range} />
      <AgCharts
        className="h-[calc(100vh_-_16rem)] mt-4"
        options={{
          ...defaultChartOptions,
          theme: {
            ...defaultChartTheme,
            palette: {
              fills: [neutralFillColor],
            },
          },
          series: [
            {
              type: "bar",
              xKey: "date",
              yKey: "value",
              yName: "Period",
              tooltip: tooltipOptions,
              itemStyler: (params) => {
                return {
                  fill:
                    isExpensesGroup || params.yValue < 0
                      ? negativeFillColor
                      : positiveFillColor,
                };
              },
            },
            {
              type: "line",
              xKey: "date",
              yKey: "average",
              yName: "Average",
              marker: { enabled: false },
              stroke: neutralStrokeColor,
              lineDash: [6, 4],
              tooltip: tooltipOptions,
            },
          ],
          tooltip: {
            mode: "single",
          },
          formatter: {
            y: (params) => formatMoney(params.value as number),
          },
          axes: [
            {
              type: "unit-time",
              position: "bottom",
              label:
                period.granularity === "quarter"
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
              value: i.node?.value ?? 0,
            }))
            .map(({ date, value }) => ({
              date,
              value: isExpensesGroup ? -value : value,
              average: isExpensesGroup ? -average : average,
            })),
        }}
      />
    </>
  );
}
