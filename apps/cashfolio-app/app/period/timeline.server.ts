import { prisma } from "~/prisma.server";
import type { TimelineRange } from "./types";
import {
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
} from "date-fns";
import { today } from "~/dates";
import type { User, UserAccountBookLink } from "~/.prisma-client/client";
import { redirect } from "react-router";
import { timelineRangeKey } from "~/view-preferences/functions";
import { getViewPreference } from "~/view-preferences/functions.server";

type NumberOfPeriodsOptions = {
  includeOpeningPeriod?: boolean;
};

export async function redirectToLastUsedTimelineRange(
  user: User,
  link: UserAccountBookLink,
) {
  const lastUsedTimelineRange =
    getViewPreference(user, timelineRangeKey(link.accountBookId)) ?? "12m";

  return redirect(`../timeline/${lastUsedTimelineRange}`);
}

export async function getNumberOfPeriods(
  accountBookId: string,
  range: TimelineRange,
  options: NumberOfPeriodsOptions = {},
) {
  const result = await prisma.booking.aggregate({
    _min: { date: true },
    where: { accountBookId: accountBookId },
  });
  if (!result._min.date) {
    throw new Error("No bookings found");
  }

  let maxPeriods =
    (range.granularity === "year"
      ? differenceInYears(today(), result._min.date)
      : range.granularity === "quarter"
        ? differenceInQuarters(today(), result._min.date)
        : differenceInMonths(today(), result._min.date)) + 1;

  if (options.includeOpeningPeriod) {
    maxPeriods++;
  }

  return Math.min(range.numberOfPeriods, maxPeriods);
}
