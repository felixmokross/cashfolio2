import { formatISODate, formatMoney } from "~/formatting";
import { Heading } from "~/platform/heading";
import { Text } from "~/platform/text";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import type { LoaderData } from "~/balances/route";
import { BalancesTableRows } from "./table-rows";
import { Form } from "react-router";
import { Field, Label } from "~/platform/forms/fieldset";
import { DateInput } from "~/platform/forms/date-input";
import { Button } from "~/platform/button";
import { useId } from "react";

export function Page({
  loaderData: { date, balanceSheet },
}: {
  loaderData: LoaderData;
}) {
  const dateLabelId = `date-label-${useId()}`;
  return (
    <>
      <Heading>Balances</Heading>
      <Text>Reference Currency: CHF</Text>

      <Form className="flex gap-4 mt-8 items-end" replace={true}>
        <Field>
          <Label id={dateLabelId}>Date</Label>
          <DateInput
            name="date"
            defaultValue={date ? formatISODate(new Date(date)) : undefined}
            aria-labelledby={dateLabelId}
          />
        </Field>
        <Button type="submit">Submit</Button>
      </Form>
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
          <Table dense bleed grid striped fixedLayout>
            <TableBody>
              <TableRow>
                <TableHeader>Equity</TableHeader>
                <TableHeader className="text-right">
                  {formatMoney(balanceSheet.equity)}
                </TableHeader>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
