import type { Period } from "./types";

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
