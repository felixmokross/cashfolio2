import { getMonth, getQuarter, getYear, subDays } from "date-fns";
import { firstDate } from "~/config";
import { today } from "~/dates";
import { getSession } from "~/sessions.server";
import type { Period } from "./types";

type PeriodDateRange = {
  from: Date;
  to: Date;
};
export async function getPeriod(request: Request): Promise<Period> {
  const session = await getSession(request.headers.get("Cookie"));

  const period = session.get("period");
  if (!period) {
    return {
      granularity: "month",
      year: getYear(today()),
      month: getMonth(today()),
    };
  }

  return period;
}

export async function getPeriodDateRange(
  request: Request,
): Promise<PeriodDateRange> {
  const period = await getPeriod(request);
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
    from = new Date(
      Date.UTC(
        Number(period.year),
        Number(period.year) === getYear(firstDate) ? getMonth(firstDate) : 0,
        1,
      ),
    );
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
