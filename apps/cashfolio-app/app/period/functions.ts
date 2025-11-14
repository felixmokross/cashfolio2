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
