import { AgCharts } from "ag-charts-react";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";
import { decrementPeriod } from "~/period/functions";
import {
  getPeriod,
  getPeriodDateRangeFromPeriod,
} from "~/period/functions.server";
import { defaultChartOptions, defaultChartTheme } from "~/platform/charts";
import { defaultShouldRevalidate } from "~/revalidation";
import { serialize } from "~/serialization";
import { getBalanceSheet } from "../functions.server";
import type { AgChartOptions } from "ag-charts-community";
import { formatMoney } from "~/formatting";
import { format, getQuarter, parseISO } from "date-fns";
import { getTheme } from "~/theme";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const period = await getPeriod(request);

  const n =
    period.granularity === "month"
      ? 24
      : period.granularity === "quarter"
        ? 12
        : 10;

  const periods = new Array(n).fill(null);

  periods[0] = period;
  for (let i = 1; i < n; i++) {
    periods[i] = decrementPeriod(periods[i - 1]);
  }

  const balanceSheets = (
    await Promise.all(
      periods.map(async (p) => {
        const periodDateRange = await getPeriodDateRangeFromPeriod(
          p,
          link.accountBookId,
        );
        return {
          periodDateRange,
          balanceSheet: await getBalanceSheet(
            link.accountBookId,
            periodDateRange.to,
          ),
        };
      }),
    )
  ).toReversed();

  return serialize({
    period,
    balanceSheets,
  });
}

export const shouldRevalidate = defaultShouldRevalidate;

export default function Route() {
  const loaderData = useLoaderData<typeof loader>();
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
  return (
    <AgCharts
      className="h-[calc(100vh_-_13rem)] mt-12"
      options={
        {
          ...defaultChartOptions,
          theme: {
            ...defaultChartTheme,
            palette: {
              fills: [positiveFillColor, negativeFillColor, neutralFillColor],
            },
          },
          series: [
            {
              type: "area",
              xKey: "date",
              yKey: "assets",
              yName: "Assets",
              marker: { enabled: true },
              interpolation: { type: "smooth" },
              tooltip: {
                renderer: (params) => ({
                  heading: format(params.datum.date, "dd MMM yyyy"),
                }),
              },
            },
            {
              type: "area",
              xKey: "date",
              yKey: "liabilities",
              yName: "Liabilities",
              marker: { enabled: true },
              interpolation: { type: "smooth" },
              tooltip: {
                renderer: (params) => ({
                  heading: format(params.datum.date, "dd MMM yyyy"),
                }),
              },
            },
            {
              type: "line",
              xKey: "date",
              yKey: "netWorth",
              yName: "Net Worth",
              marker: { enabled: true },
              interpolation: { type: "smooth" },
              tooltip: {
                renderer: (params) => ({
                  heading: format(params.datum.date, "dd MMM yyyy"),
                }),
              },
            },
          ],
          formatter: {
            y: (params) => formatMoney(params.value as number),
          },
          axes: [
            {
              type: "time",
              position: "bottom",
              label:
                loaderData.period.granularity === "quarter"
                  ? {
                      formatter: (params) => format(params.value, "QQQ yyyy"),
                    }
                  : undefined,
            },
            {
              type: "number",
              position: "left",
            },
          ],
          data: loaderData.balanceSheets.map(
            ({ periodDateRange, balanceSheet }) => ({
              date: parseISO(periodDateRange.to),
              assets: balanceSheet.assets.balance,
              liabilities: -balanceSheet.liabilities.balance,
              netWorth: balanceSheet.equity,
            }),
          ),
        } as AgChartOptions
      }
    />
  );
}
