import { format, getMonth, getQuarter, getYear } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { firstDate } from "~/config";
import { today } from "~/dates";
import { Button } from "~/platform/button";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";
import { ArrowLeftIcon, ArrowRightIcon } from "~/platform/icons/standard";
import type { Granularity } from "./types";

export function PeriodSelector() {
  const fetcher = useFetcher();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [year, setYear] = useState(getYear(today()));
  const [quarter, setQuarter] = useState(getQuarter(today()));
  const [month, setMonth] = useState(getMonth(today()));
  const firstMonthIndex = year === getYear(firstDate) ? getMonth(firstDate) : 0;
  const lastMonthIndex = year === getYear(today()) ? getMonth(today()) : 11;
  const firstQuarterIndex =
    year === getYear(firstDate) ? getQuarter(firstDate) : 1;
  const lastQuarterIndex = year === getYear(today()) ? getQuarter(today()) : 4;

  const formRef = useRef<HTMLFormElement>(null);
  const [submitAfterUpdate, setSubmitAfterUpdate] = useState(false);
  useEffect(() => {
    try {
      if (submitAfterUpdate) {
        formRef.current?.requestSubmit();
      }
    } finally {
      setSubmitAfterUpdate(false);
    }
  }, [submitAfterUpdate]);

  return (
    <fetcher.Form
      className="contents"
      action="/period/update"
      method="POST"
      ref={formRef}
    >
      <div className="space-y-2 px-2">
        <Field>
          <div className="flex gap-2 items-center" data-slot="control">
            <Select
              onChange={(e) => {
                setGranularity(e.currentTarget.value as Granularity);
                setSubmitAfterUpdate(true);
              }}
              defaultValue={granularity}
              name="granularity"
            >
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </Select>
          </div>
        </Field>
        <Field>
          <div className="flex gap-2 items-center" data-slot="control">
            <Button
              hierarchy="secondary"
              onClick={() => {
                setYear((v) => v - 1);
                setSubmitAfterUpdate(true);
              }}
              disabled={year <= getYear(firstDate)}
            >
              <ArrowLeftIcon />
            </Button>
            <Select
              onChange={(e) => {
                setYear(Number(e.currentTarget.value));
                setSubmitAfterUpdate(true);
              }}
              value={year}
              name="year"
            >
              {new Array(getYear(today()) - getYear(firstDate) + 1)
                .fill(null)
                .map((_, index) => (
                  <option key={index} value={getYear(firstDate) + index}>
                    {granularity === "year" &&
                    getYear(firstDate) + index === getYear(today())
                      ? "YTD"
                      : getYear(firstDate) + index}
                  </option>
                ))
                .toReversed()}
            </Select>
            <Button
              hierarchy="secondary"
              onClick={() => {
                setYear((v) => v + 1);
                setSubmitAfterUpdate(true);
              }}
              disabled={year >= getYear(today())}
            >
              <ArrowRightIcon />
            </Button>
          </div>
        </Field>
        {granularity === "quarter" && (
          <Field>
            <div className="flex gap-2 items-center" data-slot="control">
              <Button
                hierarchy="secondary"
                onClick={() => {
                  setQuarter((v) => v - 1);
                  setSubmitAfterUpdate(true);
                }}
                disabled={quarter <= firstQuarterIndex}
              >
                <ArrowLeftIcon />
              </Button>
              <Select
                onChange={(e) => {
                  setQuarter(Number(e.currentTarget.value));
                  setSubmitAfterUpdate(true);
                }}
                value={quarter}
                name="quarter"
              >
                {new Array(lastQuarterIndex - firstQuarterIndex + 1)
                  .fill(null)
                  .map((_, index) => (
                    <option key={index} value={firstQuarterIndex + index}>
                      {year === getYear(today()) &&
                      firstQuarterIndex + index === getQuarter(today())
                        ? "QTD"
                        : `Q${firstQuarterIndex + index}`}
                    </option>
                  ))
                  .toReversed()}
              </Select>
              <Button
                hierarchy="secondary"
                onClick={() => {
                  setQuarter((v) => v + 1);
                  setSubmitAfterUpdate(true);
                }}
                disabled={quarter >= lastQuarterIndex}
              >
                <ArrowRightIcon />
              </Button>
            </div>
          </Field>
        )}
        {granularity === "month" && (
          <Field>
            <div className="flex gap-2 items-center" data-slot="control">
              <Button
                hierarchy="secondary"
                onClick={() => {
                  setMonth((v) => v - 1);
                  setSubmitAfterUpdate(true);
                }}
                disabled={month <= firstMonthIndex}
              >
                <ArrowLeftIcon />
              </Button>
              <Select
                onChange={(e) => {
                  setMonth(Number(e.currentTarget.value));
                  setSubmitAfterUpdate(true);
                }}
                value={month}
                name="month"
              >
                {new Array(lastMonthIndex - firstMonthIndex + 1)
                  .fill(null)
                  .map((_, index) => (
                    <option key={index} value={firstMonthIndex + index}>
                      {year === getYear(today()) &&
                      firstMonthIndex + index === getMonth(today())
                        ? "MTD"
                        : format(
                            `${year}-${firstMonthIndex + index + 1}`,
                            "MMMM",
                          )}
                    </option>
                  ))
                  .toReversed()}
              </Select>
              <Button
                hierarchy="secondary"
                onClick={() => {
                  setMonth((v) => v + 1);
                  setSubmitAfterUpdate(true);
                }}
                disabled={month >= lastMonthIndex}
              >
                <ArrowRightIcon />
              </Button>
            </div>
          </Field>
        )}
      </div>
    </fetcher.Form>
  );
}
