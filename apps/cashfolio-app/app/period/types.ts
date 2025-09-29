// TODO extend to support quarters
export type Granularity = (YearPeriod | MonthPeriod)["granularity"];

export type YearPeriod = {
  granularity: "year";
  year: number;
};

export type MonthPeriod = {
  granularity: "month";
  year: number;
  month: number;
};

export type Period = YearPeriod | MonthPeriod;
