import { Outlet, useMatch, useNavigate } from "react-router";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";
import type { LoaderData } from "./route";
import { today } from "~/dates";
import { addDays, format, getYear } from "date-fns";
import {
  periodOrPeriodSpecifierKey,
  saveViewPreference,
} from "~/view-preferences/functions";
import { useAccountBook } from "~/account-books/hooks";

export function Page({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const match = useMatch("/:_/income/:_/breakdown/:_/:viewType");
  const accountBook = useAccountBook();
  return (
    <div className="space-y-4 mt-12">
      <div className="flex justify-center items-center gap-2">
        <Field>
          <Select
            value={loaderData.periodSpecifier}
            onChange={(e) => {
              const newPeriodSpecifier = e.target.value;

              const newPeriodOrPeriodSpecifier =
                newPeriodSpecifier === "month"
                  ? format(today(), "yyyy-MM")
                  : newPeriodSpecifier === "quarter"
                    ? `${format(today(), "yyyy-QQQ").toLowerCase()}`
                    : newPeriodSpecifier === "year"
                      ? format(today(), "yyyy")
                      : newPeriodSpecifier;

              navigate(
                `../breakdown/${newPeriodOrPeriodSpecifier}/${match?.params.viewType}`,
              );
              saveViewPreference(
                periodOrPeriodSpecifierKey(accountBook.id),
                newPeriodOrPeriodSpecifier,
              );
            }}
          >
            <optgroup label="Monthly">
              <option value="mtd">Month to Date</option>
              <option value="last-month">Last Month</option>
              <option value="month">Select Month…</option>
            </optgroup>
            <optgroup label="Quarterly">
              <option value="qtd">Quarter to Date</option>
              <option value="last-quarter">Last Quarter</option>
              <option value="quarter">Select Quarter…</option>
            </optgroup>
            <optgroup label="Yearly">
              <option value="ytd">Year to Date</option>
              <option value="last-year">Last Year</option>
              <option value="year">Select Year…</option>
            </optgroup>
          </Select>
        </Field>
        <Field>
          <Select
            disabled={
              !["month", "quarter", "year"].includes(loaderData.periodSpecifier)
            }
            onChange={(e) => {
              const newYear = Number(e.target.value);
              const newPeriod =
                loaderData.period.granularity === "year"
                  ? newYear.toString()
                  : loaderData.period.granularity === "quarter"
                    ? `${newYear}-q${loaderData.period.quarter}`
                    : `${newYear}-${(loaderData.period.month + 1)
                        .toString()
                        .padStart(2, "0")}`;
              navigate(`../breakdown/${newPeriod}/${match?.params.viewType}`);
              saveViewPreference(
                periodOrPeriodSpecifierKey(accountBook.id),
                newPeriod,
              );
            }}
            value={loaderData.period.year.toString()}
          >
            {new Array(
              getYear(today()) -
                getYear(addDays(loaderData.minBookingDate, 1)) +
                1,
            )
              .fill(getYear(addDays(loaderData.minBookingDate, 1)))
              .map((year, i) => (
                <option key={year + i} value={(year + i).toString()}>
                  {year + i}
                </option>
              ))
              .toReversed()}
          </Select>
        </Field>
        {loaderData.period.granularity === "quarter" && (
          <Field>
            <Select
              value={loaderData.period.quarter.toString()}
              onChange={(e) => {
                const newQuarter = Number(e.target.value);
                const newPeriod = `${loaderData.period.year}-q${newQuarter}`;
                navigate(`../breakdown/${newPeriod}/${match?.params.viewType}`);
                saveViewPreference(
                  periodOrPeriodSpecifierKey(accountBook.id),
                  newPeriod,
                );
              }}
              disabled={loaderData.periodSpecifier !== "quarter"}
            >
              <option value="4">Q4</option>
              <option value="3">Q3</option>
              <option value="2">Q2</option>
              <option value="1">Q1</option>
            </Select>
          </Field>
        )}
        {loaderData.period.granularity === "month" && (
          <Field>
            <Select
              value={loaderData.period.month.toString()}
              onChange={(e) => {
                const newMonth = Number(e.target.value);
                const newPeriod = `${loaderData.period.year}-${(newMonth + 1)
                  .toString()
                  .padStart(2, "0")}`;
                navigate(`../breakdown/${newPeriod}/${match?.params.viewType}`);
                saveViewPreference(
                  periodOrPeriodSpecifierKey(accountBook.id),
                  newPeriod,
                );
              }}
              disabled={loaderData.periodSpecifier !== "month"}
            >
              <option value="11">December</option>
              <option value="10">November</option>
              <option value="9">October</option>
              <option value="8">September</option>
              <option value="7">August</option>
              <option value="6">July</option>
              <option value="5">June</option>
              <option value="4">May</option>
              <option value="3">April</option>
              <option value="2">March</option>
              <option value="1">February</option>
              <option value="0">January</option>
            </Select>
          </Field>
        )}

        <Field>
          <Select
            onChange={(e) => navigate(e.target.value)}
            value={match?.params.viewType}
          >
            <option value="chart">Chart</option>
            <option value="table">Table</option>
          </Select>
        </Field>
      </div>

      <Outlet />
    </div>
  );
}
