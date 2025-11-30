export type TimelineView = "totals" | "breakdown" | "breakdown-table";

export type TimelineRange =
  | {
      numberOfPeriods: number;
      granularity: "year";
      period?: Omit<YearPeriod, "granularity">;
    }
  | {
      numberOfPeriods: number;
      granularity: "quarter";
      period?: Omit<QuarterPeriod, "granularity">;
    }
  | {
      numberOfPeriods: number;
      granularity: "month";
      period?: Omit<MonthPeriod, "granularity">;
    };

export type Granularity = Period["granularity"];

export type YearPeriod = {
  granularity: "year";
  year: number;
};

export type QuarterPeriod = {
  granularity: "quarter";
  year: number;
  quarter: number;
};

export type MonthPeriod = {
  granularity: "month";
  year: number;
  month: number;
};

export type Period = YearPeriod | QuarterPeriod | MonthPeriod;
