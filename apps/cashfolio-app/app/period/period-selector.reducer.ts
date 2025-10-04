import { getMonth, getQuarter, getYear, type Quarter } from "date-fns";
import type { Period } from "./types";

export type PeriodSelectorState = Period;

export type PeriodSelectorAction =
  | { type: "setGranularity"; granularity: Period["granularity"] }
  | { type: "setYear"; year: number }
  | { type: "nextYear" }
  | { type: "previousYear" }
  | { type: "setQuarter"; quarter: Quarter }
  | { type: "nextQuarter" }
  | { type: "previousQuarter" }
  | { type: "setMonth"; month: number }
  | { type: "nextMonth" }
  | { type: "previousMonth" };

export function createPeriodSelectorReducer(
  firstDate: Date | undefined,
  lastDate: Date,
) {
  return function periodSelectorReducer(
    state: PeriodSelectorState,
    action: PeriodSelectorAction,
  ): PeriodSelectorState {
    switch (action.type) {
      case "setGranularity":
        if (action.granularity === "month") {
          return ensureMonthInRange({
            granularity: "month",
            year: state.year,
            month: state.granularity === "quarter" ? state.quarter * 3 - 1 : 11,
          });
        }

        if (action.granularity === "year") {
          return { granularity: "year", year: state.year };
        }

        if (action.granularity === "quarter") {
          return ensureQuarterInRange({
            granularity: "quarter",
            year: state.year,
            quarter:
              state.granularity === "month"
                ? (Math.ceil((state.month + 1) / 3) as Quarter)
                : 4,
          });
        }

        return state;

      case "setYear":
        return ensureQuarterInRange(
          ensureMonthInRange({ ...state, year: action.year }),
        );

      case "previousYear":
        return ensureQuarterInRange(
          ensureMonthInRange({ ...state, year: state.year - 1 }),
        );

      case "nextYear":
        return ensureQuarterInRange(
          ensureMonthInRange({ ...state, year: state.year + 1 }),
        );

      case "setQuarter":
        if (state.granularity !== "quarter") {
          throw new Error(
            "Cannot set quarter when granularity is not 'quarter'",
          );
        }
        return { ...state, quarter: action.quarter };

      case "previousQuarter":
        if (state.granularity !== "quarter") {
          throw new Error(
            "Cannot go to previous quarter when granularity is not 'quarter'",
          );
        }

        if (state.quarter === 1) {
          return { ...state, year: state.year - 1, quarter: 4 };
        }
        return { ...state, quarter: (state.quarter - 1) as Quarter };

      case "nextQuarter":
        if (state.granularity !== "quarter") {
          throw new Error(
            "Cannot go to next quarter when granularity is not 'quarter'",
          );
        }

        if (state.quarter === 4) {
          return { ...state, year: state.year + 1, quarter: 1 };
        }
        return { ...state, quarter: (state.quarter + 1) as Quarter };

      case "setMonth":
        if (state.granularity !== "month") {
          throw new Error("Cannot set month when granularity is not 'month'");
        }
        return { ...state, month: action.month };

      case "previousMonth":
        if (state.granularity !== "month") {
          throw new Error(
            "Cannot go to previous month when granularity is not 'month'",
          );
        }
        if (state.month === 0) {
          return { ...state, year: state.year - 1, month: 11 };
        }

        return { ...state, month: state.month - 1 };

      case "nextMonth":
        if (state.granularity !== "month") {
          throw new Error(
            "Cannot go to next month when granularity is not 'month'",
          );
        }
        if (state.month === 11) {
          return { ...state, year: state.year + 1, month: 0 };
        }

        return { ...state, month: state.month + 1 };
    }
  };

  function ensureMonthInRange(state: PeriodSelectorState): PeriodSelectorState {
    if (state.granularity !== "month") {
      return state;
    }

    if (
      firstDate &&
      state.year === getYear(firstDate) &&
      state.month < getMonth(firstDate)
    ) {
      return { ...state, month: getMonth(firstDate) };
    }

    if (state.year === getYear(lastDate) && state.month > getMonth(lastDate)) {
      return { ...state, month: getMonth(lastDate) };
    }

    return state;
  }

  function ensureQuarterInRange(
    state: PeriodSelectorState,
  ): PeriodSelectorState {
    if (state.granularity !== "quarter") {
      return state;
    }

    if (
      firstDate &&
      state.year === getYear(firstDate) &&
      state.quarter < getQuarter(firstDate)
    ) {
      return { ...state, quarter: getQuarter(firstDate) as Quarter };
    }

    if (
      state.year === getYear(lastDate) &&
      state.quarter > getQuarter(lastDate)
    ) {
      return { ...state, quarter: getQuarter(lastDate) as Quarter };
    }

    return state;
  }
}
