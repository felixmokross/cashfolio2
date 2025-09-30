import { getMonth, getYear } from "date-fns";
import type { Period } from "./types";

export type PeriodSelectorState = Period;

export type PeriodSelectorAction =
  | { type: "setGranularity"; granularity: Period["granularity"] }
  | { type: "setYear"; year: number }
  | { type: "nextYear" }
  | { type: "previousYear" }
  //   | { type: "setQuarter"; quarter: number }
  | { type: "setMonth"; month: number }
  | { type: "nextMonth" }
  | { type: "previousMonth" };

export function createPeriodSelectorReducer(firstDate: Date, lastDate: Date) {
  return function periodSelectorReducer(
    state: PeriodSelectorState,
    action: PeriodSelectorAction,
  ): PeriodSelectorState {
    switch (action.type) {
      case "setGranularity":
        if (action.granularity === "month") {
          return ensureMonthInRange({
            ...state,
            granularity: "month",
            month: 11,
          });
        }

        if (action.granularity === "year") {
          return { granularity: "year", year: state.year };
        }
        return state;

      case "setYear":
        return ensureMonthInRange({ ...state, year: action.year });

      case "previousYear":
        return ensureMonthInRange({ ...state, year: state.year - 1 });

      case "nextYear":
        return ensureMonthInRange({ ...state, year: state.year + 1 });

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
}
