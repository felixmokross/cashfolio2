import { getMonth, getQuarter, getYear, subDays } from "date-fns";
import { today } from "~/dates";
import { getSession } from "~/sessions.server";
import type { Period } from "./types";
import { getFirstBookingDate } from "~/account-books/functions.server";

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
  accountBookId: string,
): Promise<PeriodDateRange> {
  const [period, firstBookingDate] = await Promise.all([
    getPeriod(request),
    getFirstBookingDate(accountBookId),
  ]);
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
        firstBookingDate && Number(period.year) === getYear(firstBookingDate)
          ? getMonth(firstBookingDate)
          : 0,
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
