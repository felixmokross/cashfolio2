import { formatISODate, formatMoney } from "~/formatting";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { BalancesTableRows } from "./table-rows";
import { Field } from "~/platform/forms/fieldset";
import { Select } from "~/platform/forms/select";
import type { LoaderData } from "./route";
import { useNavigate } from "react-router";
import { DateInput } from "~/platform/forms/date-input";
import { isAfter, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import {
  dateOrDateOptionKey,
  saveViewPreference,
} from "~/view-preferences/functions";
import { useAccountBook } from "~/account-books/hooks";

export function Page({
  loaderData: { balanceSheet, date, dateOption },
}: {
  loaderData: LoaderData;
}) {
  const navigate = useNavigate();
  const accountBook = useAccountBook();
  const [dateValue, setDateValue] = useState(date);

  useEffect(() => {
    setDateValue(date);
  }, [date]);

  return (
    <div className="space-y-4 mt-12">
      <div className="flex items-center justify-center gap-2">
        <Field>
          <Select
            value={dateOption}
            onChange={(e) => {
              const newDateOption = e.target.value;

              const dateOrDateOption =
                newDateOption === "date"
                  ? formatISODate(parseISO(date))
                  : newDateOption;

              navigate(`../breakdown/${dateOrDateOption}`);
              saveViewPreference(
                dateOrDateOptionKey(accountBook.id),
                dateOrDateOption,
              );
            }}
          >
            <option value="today">Today</option>
            <option value="end-of-last-month">End of Last Month</option>
            <option value="date">Select date…</option>
          </Select>
        </Field>
        <Field className="max-w-36 w-full">
          <DateInput
            value={formatISODate(parseISO(dateValue))}
            disabled={
              dateOption === "today" || dateOption === "end-of-last-month"
            }
            onChange={(value) => {
              if (value) {
                const utcDate = value.toDate("UTC");
                setDateValue(value.toString());
                if (isAfter(utcDate, Date.UTC(1970, 0, 1))) {
                  const formattedDate = formatISODate(utcDate);
                  navigate(`../breakdown/${formattedDate}`);

                  saveViewPreference(
                    dateOrDateOptionKey(accountBook.id),
                    formattedDate,
                  );
                }
              }
            }}
          />
        </Field>
      </div>
      <div className="xl:grid grid-cols-2 gap-12 mt-8">
        <Table dense bleed striped fixedLayout>
          <TableHead>
            <TableRow>
              <TableHeader>{balanceSheet.assets.name}</TableHeader>
              <TableHeader className="text-right w-32">
                <span className="sr-only">Balance in Original Currency</span>
              </TableHeader>
              <TableHeader className="text-right w-32">
                {formatMoney(balanceSheet.assets.balance)}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <BalancesTableRows node={balanceSheet.assets} />
          </TableBody>
        </Table>
        <div className="space-y-12">
          <Table bleed dense striped fixedLayout>
            <TableHead>
              <TableRow>
                <TableHeader>{balanceSheet.liabilities.name}</TableHeader>
                <TableHeader className="text-right w-32">
                  <span className="sr-only">Balance in Original Currency</span>
                </TableHeader>
                <TableHeader className="text-right w-32">
                  {formatMoney(-balanceSheet.liabilities.balance)}
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <BalancesTableRows
                node={balanceSheet.liabilities}
                negated={true}
              />
            </TableBody>
          </Table>
          <Table dense bleed striped fixedLayout>
            <TableBody>
              <TableRow>
                <TableHeader>Net Worth</TableHeader>
                <TableHeader className="text-right">
                  {formatMoney(balanceSheet.equity)}
                </TableHeader>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
