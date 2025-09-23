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
import type { LoaderData } from "~/income/route";
import { IncomeTableRows } from "./table-rows";
import { Form } from "react-router";
import { Field, Label } from "~/platform/forms/fieldset";
import { DateInput } from "~/platform/forms/date-input";
import { useId } from "react";
import { Button } from "~/platform/button";

export function Page({
  loaderData: { rootNode, fromDate, toDate },
}: {
  loaderData: LoaderData;
}) {
  const fromDateLabelId = `from-date-label-${useId()}`;
  const toDateLabelId = `to-date-label-${useId()}`;

  return (
    <>
      <Heading>Income</Heading>
      <Text>Reference Currency: CHF</Text>

      <Form className="flex gap-4 mt-8 items-end" replace={true}>
        <Field>
          <Label id={fromDateLabelId}>From</Label>
          <DateInput
            name="from"
            defaultValue={
              fromDate ? formatISODate(new Date(fromDate)) : undefined
            }
            aria-labelledby={fromDateLabelId}
          />
        </Field>
        <Field>
          <Label id={toDateLabelId}>To</Label>
          <DateInput
            name="to"
            defaultValue={toDate ? formatISODate(new Date(toDate)) : undefined}
            aria-labelledby={toDateLabelId}
          />
        </Field>
        <Button type="submit">Submit</Button>
      </Form>
      <Table
        dense
        bleed
        striped
        className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]"
      >
        <TableHead>
          <TableRow>
            <TableHeader>{rootNode.name}</TableHeader>
            <TableHeader className="text-right w-32">
              {formatMoney(rootNode.value)}
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <IncomeTableRows node={rootNode} />
        </TableBody>
      </Table>
    </>
  );
}
