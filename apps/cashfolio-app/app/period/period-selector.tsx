import { format, getMonth, getQuarter, getYear, type Quarter } from "date-fns";
import { useEffect, useReducer, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { today } from "~/dates";
import { Button } from "~/platform/button";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";
import { ArrowLeftIcon, ArrowRightIcon } from "~/platform/icons/standard";
import type { Granularity } from "./types";
import { createPeriodSelectorReducer } from "./period-selector.reducer";
import {
  useAccountBookLoaderData,
  useFirstBookingDate,
} from "~/account-books/hooks";

export function PeriodSelector() {
  const fetcher = useFetcher();
  const firstBookingDate = useFirstBookingDate();
  const { period, accountBook } = useAccountBookLoaderData();

  const [periodState, dispatch] = useReducer(
    createPeriodSelectorReducer(firstBookingDate, today()),
    period,
  );

  const firstMonthIndex =
    firstBookingDate && periodState.year === getYear(firstBookingDate)
      ? getMonth(firstBookingDate)
      : 0;
  const lastMonthIndex =
    periodState.year === getYear(today()) ? getMonth(today()) : 11;
  const firstQuarterIndex =
    firstBookingDate && periodState.year === getYear(firstBookingDate)
      ? getQuarter(firstBookingDate)
      : 1;
  const lastQuarterIndex =
    periodState.year === getYear(today()) ? getQuarter(today()) : 4;

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
      action={`/${accountBook.id}/period/update`}
      method="POST"
      ref={formRef}
    >
      <div className="space-y-2 px-2">
        <Field>
          <div className="flex gap-2 items-center" data-slot="control">
            <Select
              onChange={(e) => {
                dispatch({
                  type: "setGranularity",
                  granularity: e.currentTarget.value as Granularity,
                });
                setSubmitAfterUpdate(true);
              }}
              defaultValue={periodState.granularity}
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
                dispatch({ type: "previousYear" });
                setSubmitAfterUpdate(true);
              }}
              disabled={
                !firstBookingDate ||
                periodState.year <= getYear(firstBookingDate)
              }
            >
              <ArrowLeftIcon />
            </Button>
            <Select
              onChange={(e) => {
                dispatch({
                  type: "setYear",
                  year: Number(e.currentTarget.value),
                });
                setSubmitAfterUpdate(true);
              }}
              value={periodState.year}
              name="year"
            >
              {firstBookingDate &&
                new Array(getYear(today()) - getYear(firstBookingDate) + 1)
                  .fill(null)
                  .map((_, index) => (
                    <option
                      key={index}
                      value={getYear(firstBookingDate) + index}
                    >
                      {periodState.granularity === "year" &&
                      getYear(firstBookingDate) + index === getYear(today())
                        ? "YTD"
                        : getYear(firstBookingDate) + index}
                    </option>
                  ))
                  .toReversed()}
            </Select>
            <Button
              hierarchy="secondary"
              onClick={() => {
                dispatch({ type: "nextYear" });
                setSubmitAfterUpdate(true);
              }}
              disabled={periodState.year >= getYear(today())}
            >
              <ArrowRightIcon />
            </Button>
          </div>
        </Field>
        {periodState.granularity === "quarter" && (
          <Field>
            <div className="flex gap-2 items-center" data-slot="control">
              <Button
                hierarchy="secondary"
                onClick={() => {
                  dispatch({ type: "previousQuarter" });
                  setSubmitAfterUpdate(true);
                }}
                disabled={periodState.quarter <= firstQuarterIndex}
              >
                <ArrowLeftIcon />
              </Button>
              <Select
                onChange={(e) => {
                  dispatch({
                    type: "setQuarter",
                    quarter: Number(e.currentTarget.value) as Quarter,
                  });
                  setSubmitAfterUpdate(true);
                }}
                value={periodState.quarter}
                name="quarter"
              >
                {new Array(lastQuarterIndex - firstQuarterIndex + 1)
                  .fill(null)
                  .map((_, index) => (
                    <option key={index} value={firstQuarterIndex + index}>
                      {periodState.year === getYear(today()) &&
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
                  dispatch({ type: "nextQuarter" });
                  setSubmitAfterUpdate(true);
                }}
                disabled={periodState.quarter >= lastQuarterIndex}
              >
                <ArrowRightIcon />
              </Button>
            </div>
          </Field>
        )}
        {periodState.granularity === "month" && (
          <Field>
            <div className="flex gap-2 items-center" data-slot="control">
              <Button
                hierarchy="secondary"
                onClick={() => {
                  dispatch({ type: "previousMonth" });
                  setSubmitAfterUpdate(true);
                }}
                disabled={periodState.month <= firstMonthIndex}
              >
                <ArrowLeftIcon />
              </Button>
              <Select
                onChange={(e) => {
                  dispatch({
                    type: "setMonth",
                    month: Number(e.currentTarget.value),
                  });
                  setSubmitAfterUpdate(true);
                }}
                value={periodState.month}
                name="month"
              >
                {new Array(lastMonthIndex - firstMonthIndex + 1)
                  .fill(null)
                  .map((_, index) => (
                    <option key={index} value={firstMonthIndex + index}>
                      {periodState.year === getYear(today()) &&
                      firstMonthIndex + index === getMonth(today())
                        ? "MTD"
                        : format(
                            Date.UTC(periodState.year, firstMonthIndex + index),
                            "MMMM",
                          )}
                    </option>
                  ))
                  .toReversed()}
              </Select>
              <Button
                hierarchy="secondary"
                onClick={() => {
                  dispatch({ type: "nextMonth" });
                  setSubmitAfterUpdate(true);
                }}
                disabled={periodState.month >= lastMonthIndex}
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
