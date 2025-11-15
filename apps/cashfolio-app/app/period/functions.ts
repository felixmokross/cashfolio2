import { getMonth, getQuarter, getYear, subDays } from "date-fns";
import type { Period } from "./types";
import { today } from "~/dates";

export function decrementPeriod(period: Period) {
  if (period.granularity === "month") {
    let year = period.year;
    let month = period.month - 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    return { granularity: "month", year, month };
  } else if (period.granularity === "quarter") {
    let year = period.year;
    let quarter = period.quarter - 1;
    if (quarter < 1) {
      quarter = 4;
      year -= 1;
    }
    return { granularity: "quarter", year, quarter };
  } else if (period.granularity === "year") {
    return { granularity: "year", year: period.year - 1 };
  }
  return period;
}

export function getPeriodDateRangeFromPeriod(period: Period) {
  let from: Date;
  let to: Date;

  if (period.granularity === "month") {
    from = new Date(Date.UTC(Number(period.year), Number(period.month), 1));
    to =
      Number(period.year) === getYear(today()) &&
      Number(period.month) === getMonth(today())
        ? subDays(today(), 1)
        : new Date(Date.UTC(Number(period.year), Number(period.month) + 1, 0)); // last day of selected month
  } else if (period.granularity === "year") {
    from = new Date(Date.UTC(Number(period.year), 0, 1));
    to =
      Number(period.year) === getYear(today())
        ? subDays(today(), 1)
        : new Date(Date.UTC(Number(period.year), 11, 31));
  } else if (period.granularity === "quarter") {
    from = new Date(
      Date.UTC(Number(period.year), (Number(period.quarter) - 1) * 3, 1),
    );
    to =
      Number(period.year) === getYear(today()) &&
      Number(period.quarter) === getQuarter(today())
        ? subDays(today(), 1)
        : new Date(
            Date.UTC(Number(period.year), Number(period.quarter) * 3, 0),
          );
  } else {
    throw new Error("Invalid granularity");
  }

  return { from, to };
}

export function parsePeriod(periodOrPeriodSpecifier: string) {
  const yearPeriodResult = /^[\d]{4}$/.exec(periodOrPeriodSpecifier);
  const quarterPeriodResult = /^([\d]{4})-?q([1-4])$/i.exec(
    periodOrPeriodSpecifier,
  );
  const monthPeriodResult = /^([\d]{4})-?([\d]{1,2})$/.exec(
    periodOrPeriodSpecifier,
  );

  const periodSpecifier = yearPeriodResult
    ? "year"
    : quarterPeriodResult
      ? "quarter"
      : monthPeriodResult
        ? "month"
        : periodOrPeriodSpecifier;

  const period: Period | undefined =
    periodSpecifier === "year"
      ? { granularity: "year", year: Number(yearPeriodResult![0]) }
      : periodSpecifier === "quarter"
        ? {
            granularity: "quarter",
            year: Number(quarterPeriodResult![1]),
            quarter: Number(quarterPeriodResult![2]),
          }
        : periodSpecifier === "month"
          ? {
              granularity: "month",
              year: Number(monthPeriodResult![1]),
              month: Number(monthPeriodResult![2]) - 1,
            }
          : periodSpecifier === "mtd"
            ? {
                granularity: "month",
                year: getYear(today()),
                month: getMonth(today()),
              }
            : periodSpecifier === "last-month"
              ? {
                  granularity: "month",
                  year: getYear(today()),
                  month: getMonth(today()) - 1,
                }
              : periodSpecifier === "qtd"
                ? {
                    granularity: "quarter",
                    year: getYear(today()),
                    quarter: getQuarter(today()),
                  }
                : periodSpecifier === "last-quarter"
                  ? {
                      granularity: "quarter",
                      year: getYear(today()),
                      quarter: getQuarter(today()) - 1,
                    }
                  : periodSpecifier === "ytd"
                    ? {
                        granularity: "year",
                        year: getYear(today()),
                      }
                    : periodSpecifier === "last-year"
                      ? {
                          granularity: "year",
                          year: getYear(today()) - 1,
                        }
                      : undefined;
  if (!period) {
    throw new Response("Not Found", { status: 404 });
  }

  return { period, periodSpecifier };
}
