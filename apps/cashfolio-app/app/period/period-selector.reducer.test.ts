import { describe, expect, test } from "vitest";
import { createPeriodSelectorReducer } from "./period-selector.reducer";

const firstDate = new Date(Date.UTC(2022, 5, 1));
const lastDate = new Date(Date.UTC(2026, 8, 1));
const periodSelectorReducer = createPeriodSelectorReducer(firstDate, lastDate);

describe("granularity 'month'", () => {
  describe("'setYear' action", () => {
    test("sets the year to the specified year", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 6 },
        { type: "setYear", year: 2022 },
      );

      expect(result).toEqual({ granularity: "month", year: 2022, month: 6 });
    });

    test("sets the month to the first date's month if the new year and month are before the first date", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 4 },
        { type: "setYear", year: 2022 },
      );

      expect(result).toEqual({ granularity: "month", year: 2022, month: 5 });
    });

    test("sets the month to the last date's month if the new year and month are after the last date", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 9 },
        { type: "setYear", year: 2026 },
      );

      expect(result).toEqual({ granularity: "month", year: 2026, month: 8 });
    });
  });

  describe("'previousYear' action", () => {
    test("sets the year to the previous year", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 6 },
        { type: "previousYear" },
      );

      expect(result).toEqual({ granularity: "month", year: 2023, month: 6 });
    });

    test("sets the month to the first date's month if the new year and month are before the first date", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2023, month: 4 },
        { type: "previousYear" },
      );

      expect(result).toEqual({ granularity: "month", year: 2022, month: 5 });
    });
  });

  describe("'nextYear' action", () => {
    test("sets the year to the next year", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 6 },
        { type: "nextYear" },
      );

      expect(result).toEqual({ granularity: "month", year: 2025, month: 6 });
    });

    test("sets the month to the last date's month if the new year and month are after the last date", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2025, month: 9 },
        { type: "nextYear" },
      );

      expect(result).toEqual({ granularity: "month", year: 2026, month: 8 });
    });
  });

  describe("'setMonth' action", () => {
    test("sets the month to the specified month", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 6 },
        { type: "setMonth", month: 3 },
      );

      expect(result).toEqual({ granularity: "month", year: 2024, month: 3 });
    });
  });

  describe("'previousMonth' action", () => {
    test("sets the month to the previous month", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 6 },
        { type: "previousMonth" },
      );

      expect(result).toEqual({ granularity: "month", year: 2024, month: 5 });
    });

    test("sets the month to December of the previous year if month is January", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 0 },
        { type: "previousMonth" },
      );

      expect(result).toEqual({ granularity: "month", year: 2023, month: 11 });
    });
  });

  describe("'nextMonth' action", () => {
    test("sets the month to the next month", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 6 },
        { type: "nextMonth" },
      );

      expect(result).toEqual({ granularity: "month", year: 2024, month: 7 });
    });

    test("sets the month to January of the next year if month is December", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 11 },
        { type: "nextMonth" },
      );

      expect(result).toEqual({ granularity: "month", year: 2025, month: 0 });
    });
  });
});

describe("granularity 'quarter'", () => {
  describe("'setYear' action", () => {
    test("sets the year to the specified year", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 3 },
        { type: "setYear", year: 2022 },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2022,
        quarter: 3,
      });
    });

    test("sets the quarter to the first date's quarter if the new year and quarter are before the first date", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 1 },
        { type: "setYear", year: 2022 },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2022,
        quarter: 2,
      });
    });

    test("sets the quarter to the last date's quarter if the new year and quarter are after the last date", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 4 },
        { type: "setYear", year: 2026 },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2026,
        quarter: 3,
      });
    });
  });

  describe("'previousYear' action", () => {
    test("sets the year to the previous year", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 3 },
        { type: "previousYear" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2023,
        quarter: 3,
      });
    });

    test("sets the quarter to the first date's quarter if the new year and quarter are before the first date", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2023, quarter: 1 },
        { type: "previousYear" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2022,
        quarter: 2,
      });
    });
  });

  describe("'nextYear' action", () => {
    test("sets the year to the next year", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 3 },
        { type: "nextYear" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2025,
        quarter: 3,
      });
    });

    test("sets the quarter to the last date's quarter if the new year and quarter are after the last date", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2025, quarter: 4 },
        { type: "nextYear" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2026,
        quarter: 3,
      });
    });
  });

  describe("'setQuarter' action", () => {
    test("sets the quarter to the specified quarter", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 3 },
        { type: "setQuarter", quarter: 2 },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2024,
        quarter: 2,
      });
    });
  });

  describe("'previousQuarter' action", () => {
    test("sets the quarter to the previous quarter", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 3 },
        { type: "previousQuarter" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2024,
        quarter: 2,
      });
    });

    test("sets the quarter to 4 of the previous year if quarter is 1", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 1 },
        { type: "previousQuarter" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2023,
        quarter: 4,
      });
    });
  });

  describe("'nextQuarter' action", () => {
    test("sets the quarter to the next quarter", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 3 },
        { type: "nextQuarter" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2024,
        quarter: 4,
      });
    });

    test("sets the quarter to 1 of the next year if quarter is 4", () => {
      const result = periodSelectorReducer(
        { granularity: "quarter", year: 2024, quarter: 4 },
        { type: "nextQuarter" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2025,
        quarter: 1,
      });
    });
  });
});

describe("granularity 'year'", () => {
  describe("'setYear' action", () => {
    test("sets the year to the specified year", () => {
      const result = periodSelectorReducer(
        { granularity: "year", year: 2024 },
        { type: "setYear", year: 2022 },
      );

      expect(result).toEqual({ granularity: "year", year: 2022 });
    });
  });

  describe("'previousYear' action", () => {
    test("sets the year to the previous year", () => {
      const result = periodSelectorReducer(
        { granularity: "year", year: 2024 },
        { type: "previousYear" },
      );

      expect(result).toEqual({ granularity: "year", year: 2023 });
    });
  });

  describe("'nextYear' action", () => {
    test("sets the year to the next year", () => {
      const result = periodSelectorReducer(
        { granularity: "year", year: 2024 },
        { type: "nextYear" },
      );

      expect(result).toEqual({ granularity: "year", year: 2025 });
    });
  });
});

describe("'setGranularity' action", () => {
  describe("'month'", () => {
    describe("if previous granularity was 'quarter'", () => {
      test("sets the granularity to 'month' and month to the previous quarter's last month", () => {
        const result = periodSelectorReducer(
          { granularity: "quarter", year: 2024, quarter: 3 },
          { type: "setGranularity", granularity: "month" },
        );

        expect(result).toEqual({
          granularity: "month",
          year: 2024,
          month: 8,
        });
      });
    });

    describe("if previous granularity was 'year'", () => {
      test("sets the granularity to 'month' and month to December", () => {
        const result = periodSelectorReducer(
          { granularity: "year", year: 2024 },
          { type: "setGranularity", granularity: "month" },
        );

        expect(result).toEqual({ granularity: "month", year: 2024, month: 11 });
      });
    });

    test("sets the granularity to 'month' and month to the last month if the current year is the last date's year", () => {
      const result = periodSelectorReducer(
        { granularity: "year", year: 2026 },
        { type: "setGranularity", granularity: "month" },
      );

      expect(result).toEqual({ granularity: "month", year: 2026, month: 8 });
    });
  });

  describe("'quarter'", () => {
    describe("if previous granularity was 'year'", () => {
      test("sets the granularity to 'quarter' and quarter to 4", () => {
        const result = periodSelectorReducer(
          { granularity: "year", year: 2024 },
          { type: "setGranularity", granularity: "quarter" },
        );

        expect(result).toEqual({
          granularity: "quarter",
          year: 2024,
          quarter: 4,
        });
      });
    });

    describe("if previous granularity was 'month'", () => {
      test("sets the granularity to 'quarter' and quarter to the previous month's quarter", () => {
        const result = periodSelectorReducer(
          { granularity: "month", year: 2024, month: 6 },
          { type: "setGranularity", granularity: "quarter" },
        );

        expect(result).toEqual({
          granularity: "quarter",
          year: 2024,
          quarter: 3,
        });
      });
    });

    test("sets the granularity to 'quarter' and quarter to the last quarter if the current year is the last date's year", () => {
      const result = periodSelectorReducer(
        { granularity: "year", year: 2026 },
        { type: "setGranularity", granularity: "quarter" },
      );

      expect(result).toEqual({
        granularity: "quarter",
        year: 2026,
        quarter: 3,
      });
    });
  });

  describe("'year'", () => {
    test("sets the granularity to 'year'", () => {
      const result = periodSelectorReducer(
        { granularity: "month", year: 2024, month: 6 },
        { type: "setGranularity", granularity: "year" },
      );

      expect(result).toEqual({ granularity: "year", year: 2024 });
    });
  });
});
