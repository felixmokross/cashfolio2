import clsx from "clsx";
import type { Granularity, Period } from "./types";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";
import { useNavigate } from "react-router";

const LIMITED_RANGE_REGEX = /^(\d+)([ymq])$/;
const MAX_RANGE_REGEX = /^max-(year|month|quarter)$/;

export function parseRange(range: string): [Granularity, number | "max"] {
  const normalizedRange = range.toLowerCase().trim();

  // 5y  12m  4q
  const limitedRangeResult = LIMITED_RANGE_REGEX.exec(normalizedRange);
  if (limitedRangeResult) {
    const [, count, granularityChar] = limitedRangeResult;
    const granularity =
      granularityChar === "y"
        ? "year"
        : granularityChar === "m"
          ? "month"
          : granularityChar === "q"
            ? "quarter"
            : null;
    if (!granularity) {
      throw new Error(
        `bad range ${range}: invalid granularity '${granularityChar}'`,
      );
    }
    return [granularity, Number(count)];
  }

  // max-years  max-months  max-quarters
  const maxRangeResult = MAX_RANGE_REGEX.exec(normalizedRange);
  if (maxRangeResult) {
    const [, granularity] = maxRangeResult;
    return [granularity, "max"] as [Granularity, number | "max"];
  }

  throw new Error(`bad range ${normalizedRange}: unrecognized format`);
}

export function TimelineSelector({
  className,
  period,
  range,
}: {
  className?: string;
  period: Period;
  range: string;
}) {
  const navigate = useNavigate();
  return (
    <div className={clsx("flex items-center justify-center gap-2", className)}>
      <Field>
        <Select
          value={period.granularity}
          onChange={(e) => {
            const newRange =
              e.target.value === "year"
                ? "5y"
                : e.target.value === "quarter"
                  ? "4q"
                  : "12m";
            navigate(`../timeline/${newRange}`);
          }}
        >
          <option value="year">Years</option>
          <option value="quarter">Quarters</option>
          <option value="month">Months</option>
        </Select>
      </Field>
      <Field>
        <Select
          value={range}
          onChange={(e) => {
            navigate(`../timeline/${e.target.value}`);
          }}
        >
          {period.granularity === "year" ? (
            <>
              <option value="5y">Last 5 Years</option>
              <option value="10y">Last 10 Years</option>
              <option value="max-year">Max</option>
            </>
          ) : period.granularity === "quarter" ? (
            <>
              <option value="4q">Last 4 Quarters</option>
              <option value="8q">Last 8 Quarters</option>
              <option value="12q">Last 12 Quarters</option>
              <option value="24q">Last 24 Quarters</option>
              <option value="max-quarter">Max</option>
            </>
          ) : period.granularity === "month" ? (
            <>
              <option value="12m">Last 12 Months</option>
              <option value="24m">Last 24 Months</option>
              <option value="36m">Last 36 Months</option>
              <option value="48m">Last 48 Months</option>
              <option value="max-month">Max</option>
            </>
          ) : null}
        </Select>
      </Field>
    </div>
  );
}
