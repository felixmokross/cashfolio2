// TODO extend to support quarters
export type Granularity = Period["granularity"];

export type YearPeriod = {
  granularity: "year";
  year: number;
};

export type QuarterPeriod = {
  granularity: "quarter";
  year: number;
  quarter: 1 | 2 | 3 | 4;
};

export type MonthPeriod = {
  granularity: "month";
  year: number;
  month: number;
};

export type Period = YearPeriod | QuarterPeriod | MonthPeriod;
